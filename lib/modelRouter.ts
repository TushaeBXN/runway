/**
 * Smart model router — matches task complexity to the right model tier.
 *
 * Philosophy (from Composio tool-calling guide):
 * - Dynamic context loading reduces token usage by 85%
 * - Only load the tools and context each task actually needs
 * - Route simple tasks to cheap/local models; complex tasks to powerful models
 * - Never burn frontier model tokens on work a small model can handle
 *
 * Complexity tiers:
 *   simple   → status reports, summaries, categorization, short drafts
 *   medium   → social posts, email templates, job scoring, task lists
 *   complex  → grant strategies, donor emails, full deliverables, analysis
 *   research → anything requiring live web search + synthesis
 */

import type { LLMConfig, LLMProvider } from "./llm";

export type TaskComplexity = "simple" | "medium" | "complex" | "research";

export interface RoutedConfig extends LLMConfig {
  modelOverride?: string;
  maxTokens: number;
  complexity: TaskComplexity;
}

// Model tiers per provider
const MODEL_TIERS: Record<LLMProvider, Record<TaskComplexity, string>> = {
  anthropic: {
    simple:   "claude-haiku-4-5-20251001",   // cheapest, fastest
    medium:   "claude-haiku-4-5-20251001",   // haiku handles medium well
    complex:  "claude-sonnet-4-6",           // full reasoning
    research: "claude-sonnet-4-6",           // web search needs sonnet
  },
  openai: {
    simple:   "gpt-4o-mini",
    medium:   "gpt-4o-mini",
    complex:  "gpt-4o",
    research: "gpt-4o",
  },
  gemini: {
    simple:   "gemini-1.5-flash",
    medium:   "gemini-1.5-flash",
    complex:  "gemini-1.5-pro",
    research: "gemini-1.5-pro",
  },
  ollama: {
    // Local models — always free, use same model for all tiers
    simple:   process.env.OLLAMA_MODEL || "llama3.2:3b",
    medium:   process.env.OLLAMA_MODEL || "llama3.2:3b",
    complex:  process.env.OLLAMA_MODEL || "llama3.2:3b",
    research: process.env.OLLAMA_MODEL || "llama3.2:3b",
  },
  abacus: {
    simple:   "llama-3.3-70b",       // fast, free-tier capable
    medium:   "claude-3-5-haiku",    // balanced for drafts / support
    complex:  "claude-3-5-sonnet",   // best for grants / finance / research
    research: "claude-3-5-sonnet",   // research needs frontier reasoning
  },
};

// Max tokens per complexity (don't waste context on simple tasks)
const TOKEN_LIMITS: Record<TaskComplexity, number> = {
  simple:   512,
  medium:   1024,
  complex:  4096,
  research: 8192,
};

/**
 * Build an LLMConfig routed to the right model for the given task complexity.
 * Reads user settings from DB if userId is provided; falls back to env vars.
 */
export async function routeModel(
  complexity: TaskComplexity,
  userSettings?: {
    llmProvider?: string;
    anthropicKey?: string;
    openaiKey?: string;
    geminiKey?: string;
    ollamaModel?: string;
    ollamaHost?: string;
    abacusApiKey?: string;
    abacusEndpoint?: string;
  } | null
): Promise<RoutedConfig> {
  const { getProvider } = await import("./llm");
  const provider = (userSettings?.llmProvider as LLMProvider) ?? getProvider();

  const tiers = MODEL_TIERS[provider] ?? MODEL_TIERS.ollama;
  const modelOverride = provider === "ollama"
    ? (userSettings?.ollamaModel ?? process.env.OLLAMA_MODEL ?? "llama3.2:3b")
    : tiers[complexity];

  return {
    provider,
    modelOverride,
    maxTokens: TOKEN_LIMITS[complexity],
    complexity,
    anthropicKey: userSettings?.anthropicKey,
    openaiKey: userSettings?.openaiKey,
    geminiKey: userSettings?.geminiKey,
    ollamaHost: userSettings?.ollamaHost,
    ollamaModel: userSettings?.ollamaModel,
    abacusApiKey: userSettings?.abacusApiKey,
    abacusEndpoint: userSettings?.abacusEndpoint,
  };
}

/**
 * Annotate each agent's tasks with their complexity.
 * Used by scheduler to route calls correctly.
 */
export const AGENT_COMPLEXITY: Record<string, TaskComplexity> = {
  // Simple — CEO summaries, status, short delegation notes
  ceoAgent:            "simple",
  devAgent:            "simple",
  hardwareFundAgent:   "simple",

  // Medium — social content, email templates, job scoring
  marketingAgent:      "medium",
  inboxAgent:          "medium",
  upworkScoutAgent:    "medium",

  // Complex — grant strategies, full deliverables, donor emails
  grantArchitectAgent: "complex",
  jobExecutorAgent:    "complex",
  marketResearchAgent: "complex",
};

/**
 * Minimal context builder — only include what each agent needs.
 * Implements the "dynamic loading" principle from Composio guide.
 * Reduces token usage by stripping irrelevant context.
 */
export function buildAgentContext(agentId: string, orgContext: {
  orgName?: string;
  mission?: string;
  focusAreas?: string;
  location?: string;
}): string {
  const base = orgContext.orgName
    ? `Organization: ${orgContext.orgName}${orgContext.location ? `, ${orgContext.location}` : ""}.\nMission: ${orgContext.mission ?? "Technology and education nonprofit"}.`
    : "Organization: Runway Tech Education Nonprofit, Winston-Salem, NC.\nMission: Cybersecurity, AI literacy, and STEM education.";

  // Only include focus areas for agents that actually need them
  const needsFocus = ["grantArchitectAgent", "marketResearchAgent", "marketingAgent", "ceoAgent"].includes(agentId);
  const focusLine = needsFocus && orgContext.focusAreas ? `\nFocus areas: ${orgContext.focusAreas}.` : "";

  return base + focusLine;
}
