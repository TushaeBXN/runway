/**
 * Unified LLM client — switches between Anthropic, OpenAI, Gemini, and Ollama
 * based on LLM_PROVIDER env var or per-user settings passed at call time.
 */

import { Ollama } from "ollama";
type Anthropic = import("@anthropic-ai/sdk").default;

export type LLMProvider = "anthropic" | "openai" | "gemini" | "ollama" | "abacus";
export type TaskComplexity = "simple" | "medium" | "complex" | "research";

export function getProvider(): LLMProvider {
  const p = process.env.LLM_PROVIDER?.toLowerCase();
  if (p === "openai") return "openai";
  if (p === "gemini") return "gemini";
  if (p === "ollama") return "ollama";
  return "anthropic";
}

export function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL || "llama3.2:3b";
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-1.5-flash";
}

export interface LLMConfig {
  provider?: LLMProvider;
  anthropicKey?: string;
  openaiKey?: string;
  geminiKey?: string;
  ollamaHost?: string;
  ollamaModel?: string;
  modelOverride?: string; // explicit model name — overrides tier defaults
  json?: boolean; // false = plain text (Ollama won't force JSON format)
  // Abacus.ai
  abacusApiKey?: string;
  abacusEndpoint?: string;
  taskComplexity?: TaskComplexity; // hint for Abacus smart routing
}

// Abacus smart model routing — maps task complexity to the right model
const ABACUS_MODEL_MAP: Record<TaskComplexity, string> = {
  simple:   "llama-3.3-70b",       // fast, great for routing / status / casual
  medium:   "claude-3-5-haiku",    // balanced for drafts, emails, support
  complex:  "claude-3-5-sonnet",   // best for grants, financial analysis
  research: "claude-3-5-sonnet",   // research needs frontier reasoning
};

/**
 * Robustly extract JSON from a string that may contain prose, code fences,
 * or trailing text. Works for both objects ({}) and arrays ([]).
 */
export function parseJSON<T>(raw: string): T {
  let text = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  try {
    return JSON.parse(text) as T;
  } catch {
    const objMatch = text.match(/\{[\s\S]*\}/);
    const arrMatch = text.match(/\[[\s\S]*\]/);

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
  maxTokens = 4096,
  config?: LLMConfig
): Promise<string> {
  const provider = config?.provider ?? getProvider();
  if (provider === "ollama") return callOllama(systemPrompt, userMessage, config);
  if (provider === "openai") return callOpenAI(systemPrompt, userMessage, maxTokens, config);
  if (provider === "gemini") return callGemini(systemPrompt, userMessage, maxTokens, config);
  if (provider === "abacus") return callAbacus(systemPrompt, userMessage, maxTokens, config);
  return callAnthropic(systemPrompt, userMessage, maxTokens, config);
}

// --- Anthropic ---

let _anthropic: Anthropic | null = null;

async function getAnthropicClient(apiKey?: string): Promise<Anthropic> {
  const { default: AnthropicSDK } = await import("@anthropic-ai/sdk");
  if (apiKey) return new AnthropicSDK({ apiKey }) as unknown as Anthropic;
  if (!_anthropic) {
    _anthropic = new AnthropicSDK({ apiKey: process.env.ANTHROPIC_API_KEY }) as unknown as Anthropic;
  }
  return _anthropic;
}

async function callAnthropic(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  config?: LLMConfig,
  retries = 3
): Promise<string> {
  const client = await getAnthropicClient(config?.anthropicKey);
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: config?.modelOverride ?? getAnthropicModel(),
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });
      const block = response.content[0];
      if (block.type !== "text") throw new Error("Unexpected Anthropic response type");
      return block.text;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429 && attempt < retries) {
        const wait = Math.pow(2, attempt + 1) * 5000;
        console.warn(`[LLM] Rate limited. Retrying in ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// --- OpenAI ---

async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  config?: LLMConfig,
  retries = 3
): Promise<string> {
  const apiKey = config?.openaiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config?.modelOverride ?? getOpenAIModel(),
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      });
      if (!res.ok) {
        if (res.status === 429 && attempt < retries) {
          const wait = Math.pow(2, attempt + 1) * 5000;
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      return data.choices[0].message.content as string;
    } catch (err) {
      if (attempt >= retries) throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// --- Gemini ---

async function callGemini(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  config?: LLMConfig,
  retries = 3
): Promise<string> {
  const apiKey = config?.geminiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const model = config?.modelOverride ?? getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      });
      if (!res.ok) {
        if (res.status === 429 && attempt < retries) {
          const wait = Math.pow(2, attempt + 1) * 5000;
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      return data.candidates[0].content.parts[0].text as string;
    } catch (err) {
      if (attempt >= retries) throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// --- Abacus.ai ChatLLM ---

async function callAbacus(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  config?: LLMConfig,
  retries = 3
): Promise<string> {
  const apiKey = config?.abacusApiKey ?? process.env.ABACUS_API_KEY;
  if (!apiKey) throw new Error("Abacus.ai API key not configured");

  const baseUrl = (config?.abacusEndpoint ?? process.env.ABACUS_ENDPOINT ?? "https://apps.abacus.ai/api/v0").replace(/\/$/, "");
  const complexity = config?.taskComplexity ?? "medium";
  const model = config?.modelOverride ?? ABACUS_MODEL_MAP[complexity];

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      });
      if (!res.ok) {
        if (res.status === 429 && attempt < retries) {
          const wait = Math.pow(2, attempt + 1) * 5000;
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw new Error(`Abacus error ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      return data.choices[0].message.content as string;
    } catch (err) {
      if (attempt >= retries) throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// --- Ollama ---

let _ollama: Ollama | null = null;

function getOllamaClient(host?: string): Ollama {
  if (host) return new Ollama({ host });
  if (!_ollama) {
    _ollama = new Ollama({ host: process.env.OLLAMA_HOST || "http://localhost:11434" });
  }
  return _ollama;
}

async function callOllama(
  systemPrompt: string,
  userMessage: string,
  config?: LLMConfig
): Promise<string> {
  const client = getOllamaClient(config?.ollamaHost);
  const model = config?.ollamaModel ?? getOllamaModel();
  const response = await client.chat({
    model,
    ...(config?.json !== false ? { format: "json" } : {}),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  return response.message.content;
}

/**
 * Calls with web search when using cloud providers.
 * Falls back to plain callOllama for local providers.
 */
export async function callLLMWithSearch(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 8192,
  config?: LLMConfig
): Promise<string> {
  const provider = config?.provider ?? getProvider();
  if (provider === "ollama") return callOllama(systemPrompt, userMessage, config);
  if (provider === "openai") return callOpenAI(systemPrompt, userMessage, maxTokens, config);
  if (provider === "gemini") return callGemini(systemPrompt, userMessage, maxTokens, config);
  return _callAnthropicWithSearch(systemPrompt, userMessage, maxTokens, config);
}

async function _callAnthropicWithSearch(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  config?: LLMConfig,
  retries = 3
): Promise<string> {
  const client = await getAnthropicClient(config?.anthropicKey);
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: getAnthropicModel(),
        max_tokens: maxTokens,
        system: systemPrompt,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
        messages: [{ role: "user", content: userMessage }],
      });

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

      if (!text) throw new Error("No text content in web search response");
      return text;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429 && attempt < retries) {
        const wait = Math.pow(2, attempt + 1) * 5000;
        console.warn(`[LLM] Search rate limited. Retrying in ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function callLLMChat(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens = 1024,
  config?: LLMConfig
): Promise<string> {
  const provider = config?.provider ?? getProvider();

  if (provider === "ollama") {
    const client = getOllamaClient(config?.ollamaHost);
    const model = config?.ollamaModel ?? getOllamaModel();
    const response = await client.chat({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    });
    return response.message.content;
  }

  if (provider === "openai") {
    const apiKey = config?.openaiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI API key not configured");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: getOpenAIModel(),
        max_tokens: maxTokens,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });
    const data = await res.json();
    return data.choices[0].message.content as string;
  }

  if (provider === "gemini") {
    const apiKey = config?.geminiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API key not configured");
    const model = getGeminiModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });
    const data = await res.json();
    return data.candidates[0].content.parts[0].text as string;
  }

  const client = await getAnthropicClient(config?.anthropicKey);
  const response = await client.messages.create({
    model: getAnthropicModel(),
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected Anthropic response type");
  return block.text;
}
