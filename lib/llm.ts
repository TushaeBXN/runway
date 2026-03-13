/**
 * Unified LLM client — switches between Anthropic and Ollama
 * based on LLM_PROVIDER env var ("anthropic" | "ollama")
 */

import Anthropic from "@anthropic-ai/sdk";
import { Ollama } from "ollama";

export type LLMProvider = "anthropic" | "ollama";

export function getProvider(): LLMProvider {
  const p = process.env.LLM_PROVIDER?.toLowerCase();
  if (p === "ollama") return "ollama";
  return "anthropic";
}

export function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL || "llama3.2";
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
}

/**
 * Robustly extract JSON from a string that may contain prose, code fences,
 * or trailing text. Works for both objects ({}) and arrays ([]).
 */
export function parseJSON<T>(raw: string): T {
  // 1. Strip markdown code fences
  let text = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  // 2. Try direct parse first
  try {
    return JSON.parse(text) as T;
  } catch {
    // 3. Extract the first complete JSON object or array
    const objMatch = text.match(/\{[\s\S]*\}/);
    const arrMatch = text.match(/\[[\s\S]*\]/);

    // Pick whichever appears first in the text
    let extracted: string | null = null;
    const objIdx = objMatch ? text.indexOf(objMatch[0]) : Infinity;
    const arrIdx = arrMatch ? text.indexOf(arrMatch[0]) : Infinity;

    if (objIdx <= arrIdx && objMatch) extracted = objMatch[0];
    else if (arrMatch) extracted = arrMatch[0];

    if (extracted) {
      return JSON.parse(extracted) as T;
    }

    throw new Error(`Could not parse JSON from response: ${text.slice(0, 200)}`);
  }
}

export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096
): Promise<string> {
  if (getProvider() === "ollama") {
    return callOllama(systemPrompt, userMessage);
  }
  return callAnthropic(systemPrompt, userMessage, maxTokens);
}

// --- Anthropic ---

let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

async function callAnthropic(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
): Promise<string> {
  const response = await getAnthropicClient().messages.create({
    model: getAnthropicModel(),
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected Anthropic response type");
  return block.text;
}

// --- Ollama ---

let _ollama: Ollama | null = null;

function getOllamaClient(): Ollama {
  if (!_ollama) {
    _ollama = new Ollama({
      host: process.env.OLLAMA_HOST || "http://localhost:11434",
    });
  }
  return _ollama;
}

async function callOllama(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  // format: "json" forces Ollama to output valid JSON — no prose preamble
  const response = await getOllamaClient().chat({
    model: getOllamaModel(),
    format: "json",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  return response.message.content;
}

/**
 * Calls Anthropic with web search enabled so the model can look up
 * live information before responding. Falls back to plain callOllama
 * when using a local provider (Ollama has no built-in search).
 */
export async function callLLMWithSearch(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 8192
): Promise<string> {
  if (getProvider() === "ollama") {
    return callOllama(systemPrompt, userMessage);
  }

  const response = await getAnthropicClient().messages.create({
    model: getAnthropicModel(),
    max_tokens: maxTokens,
    system: systemPrompt,
    // web_search_20250305 is a server-side tool — Anthropic executes the
    // searches automatically and returns results inline with the response.
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  if (!text) throw new Error("No text content in web search response");
  return text;
}

// Chat variant (no JSON mode — free-form conversation)
export async function callLLMChat(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens = 1024
): Promise<string> {
  if (getProvider() === "ollama") {
    const response = await getOllamaClient().chat({
      model: getOllamaModel(),
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });
    return response.message.content;
  }

  const response = await getAnthropicClient().messages.create({
    model: getAnthropicModel(),
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected Anthropic response type");
  return block.text;
}
