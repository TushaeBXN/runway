/**
 * Smart model router — matches task type and complexity to the right model.
 *
 * Task-type routing (cross-provider):
 *   image_generation  → Gemini      (vision / image models)
 *   deep_planning     → Claude      (strategy, board reports, org decisions)
 *   grant_writing     → Claude      (long-form, nuanced persuasion)
 *   financial         → Claude      (financial analysis, reserve fund, budget)
 *   research          → Claude      (web synthesis, grant scouting)
 *   coding            → GPT-4o      (code generation, debugging, scripts)
 *   email_draft       → Haiku       (quick, clear prose)
 *   social_content    → Haiku       (short-form, punchy copy)
 *   light_task        → Haiku       (status notes, categorization, routing)
 *
 * When Abacus is the configured provider, every task type routes THROUGH
 * Abacus but requests the right underlying model by name — so you only need
 * one API key to access Claude, GPT-4o, Gemini, and Haiku.
 *
 * When using a direct provider (Anthropic, OpenAI, etc.), task types fall
 * back to complexity tiers within that provider's model family.
 */

import type { LLMConfig, LLMProvider } from "./llm";

export type TaskComplexity = "simple" | "medium" | "complex" | "research";

export type TaskType =
  | "image_generation"  // visual / generative media
  | "deep_planning"     // strategy, board reports, org decisions
  | "grant_writing"     // long-form grant narratives
  | "financial"         // budgets, reserve fund, financial analysis
  | "research"          // web-grounded research & synthesis
  | "coding"            // code generation, debugging, scripting
  | "email_draft"       // professional email drafts
  | "social_content"    // social media posts, captions
  | "light_task";       // status notes, categorization, routing

export interface RoutedConfig extends LLMConfig {
  modelOverride?: string;
  maxTokens: number;
  complexity: TaskComplexity;
  taskType?: TaskType;
}

// ── Per-task-type routing table ──────────────────────────────────────────────
// Each entry defines:
//   preferredProvider  — the ideal provider when keys are available
//   preferredModel     — the model on that provider
//   abacusModel        — model name to pass through Abacus (single key, any model)
//   complexity         — fallback complexity when routing within a single provider
//   maxTokens          — sensible ceiling for this task type

interface TaskRoute {
  preferredProvider: LLMProvider;
  preferredModel: string;
  abacusModel: string;
  complexity: TaskComplexity;
  maxTokens: number;
}

export const TASK_ROUTES: Record<TaskType, TaskRoute> = {
  image_generation: {
    preferredProvider: "gemini",
    preferredModel:    "gemini-1.5-pro",
    abacusModel:       "gemini-1.5-pro",
    complexity:        "complex",
    maxTokens:         2048,
  },
  deep_planning: {
    preferredProvider: "anthropic",
    preferredModel:    "claude-sonnet-4-6",
    abacusModel:       "claude-3-5-sonnet",
    complexity:        "complex",
    maxTokens:         8192,
  },
  grant_writing: {
    preferredProvider: "anthropic",
    preferredModel:    "claude-sonnet-4-6",
    abacusModel:       "claude-3-5-sonnet",
    complexity:        "complex",
    maxTokens:         8192,
  },
  financial: {
    preferredProvider: "anthropic",
    preferredModel:    "claude-sonnet-4-6",
    abacusModel:       "claude-3-5-sonnet",
    complexity:        "complex",
    maxTokens:         4096,
  },
  research: {
    preferredProvider: "anthropic",
    preferredModel:    "claude-sonnet-4-6",
    abacusModel:       "claude-3-5-sonnet",
    complexity:        "research",
    maxTokens:         8192,
  },
  coding: {
    preferredProvider: "openai",
    preferredModel:    "gpt-4o",
    abacusModel:       "gpt-4o",
    complexity:        "complex",
    maxTokens:         4096,
  },
  email_draft: {
    preferredProvider: "anthropic",
    preferredModel:    "claude-haiku-4-5-20251001",
    abacusModel:       "claude-3-5-haiku",
    complexity:        "medium",
    maxTokens:         1024,
  },
  social_content: {
    preferredProvider: "anthropic",
    preferredModel:    "claude-haiku-4-5-20251001",
    abacusModel:       "claude-3-5-haiku",
    complexity:        "medium",
    maxTokens:         1024,
  },
  light_task: {
    preferredProvider: "anthropic",
    preferredModel:    "claude-haiku-4-5-20251001",
    abacusModel:       "claude-3-5-haiku",
    complexity:        "simple",
    maxTokens:         512,
  },
};

// ── Complexity-based fallback tiers (single-provider mode) ───────────────────

const COMPLEXITY_MODELS: Record<LLMProvider, Record<TaskComplexity, string>> = {
  anthropic: {
    simple:   "claude-haiku-4-5-20251001",
    medium:   "claude-haiku-4-5-20251001",
    complex:  "claude-sonnet-4-6",
    research: "claude-sonnet-4-6",
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
    simple:   process.env.OLLAMA_MODEL || "llama3.2:3b",
    medium:   process.env.OLLAMA_MODEL || "llama3.2:3b",
    complex:  process.env.OLLAMA_MODEL || "llama3.2:3b",
    research: process.env.OLLAMA_MODEL || "llama3.2:3b",
  },
  abacus: {
    simple:   "claude-3-5-haiku",
    medium:   "claude-3-5-haiku",
    complex:  "claude-3-5-sonnet",
    research: "claude-3-5-sonnet",
  },
};

// ── Main routing functions ────────────────────────────────────────────────────

export interface UserSettings {
  llmProvider?: string;
  anthropicKey?: string;
  openaiKey?: string;
  geminiKey?: string;
  ollamaModel?: string;
  ollamaHost?: string;
  abacusApiKey?: string;
  abacusEndpoint?: string;
}

/**
 * Route by task type — the primary API for agents.
 *
 * Logic:
 *   1. If provider is Abacus → use Abacus endpoint with the task-type model.
 *   2. If task's preferred provider matches the configured provider → use it.
 *   3. Otherwise fall back to complexity-based routing within configured provider.
 */
export async function routeByTaskType(
  taskType: TaskType,
  userSettings?: UserSettings | null,
): Promise<RoutedConfig> {
  const { getProvider } = await import("./llm");
  const provider = (userSettings?.llmProvider as LLMProvider) ?? getProvider();
  const route = TASK_ROUTES[taskType];

  let modelOverride: string;

  if (provider === "abacus") {
    // Abacus is a universal gateway — always use it, pick the right model
    modelOverride = route.abacusModel;
  } else if (provider === route.preferredProvider) {
    // User's configured provider IS the ideal one for this task
    modelOverride = route.preferredModel;
  } else if (provider === "ollama") {
    // Ollama: always use local model regardless of task type
    modelOverride = userSettings?.ollamaModel ?? process.env.OLLAMA_MODEL ?? "llama3.2:3b";
  } else {
    // Mismatch — fall back to complexity tier within the configured provider
    modelOverride = COMPLEXITY_MODELS[provider]?.[route.complexity] ?? route.preferredModel;
  }

  return {
    provider,
    modelOverride,
    maxTokens: route.maxTokens,
    complexity: route.complexity,
    taskType,
    anthropicKey:  userSettings?.anthropicKey,
    openaiKey:     userSettings?.openaiKey,
    geminiKey:     userSettings?.geminiKey,
    ollamaHost:    userSettings?.ollamaHost,
    ollamaModel:   userSettings?.ollamaModel,
    abacusApiKey:  userSettings?.abacusApiKey,
    abacusEndpoint: userSettings?.abacusEndpoint,
  };
}

/**
 * Legacy complexity-based routing (kept for backward compat).
 */
export async function routeModel(
  complexity: TaskComplexity,
  userSettings?: UserSettings | null,
): Promise<RoutedConfig> {
  const { getProvider } = await import("./llm");
  const provider = (userSettings?.llmProvider as LLMProvider) ?? getProvider();

  const modelOverride = provider === "ollama"
    ? (userSettings?.ollamaModel ?? process.env.OLLAMA_MODEL ?? "llama3.2:3b")
    : (COMPLEXITY_MODELS[provider]?.[complexity] ?? COMPLEXITY_MODELS.anthropic[complexity]);

  return {
    provider,
    modelOverride,
    maxTokens: TOKEN_LIMITS[complexity],
    complexity,
    anthropicKey:  userSettings?.anthropicKey,
    openaiKey:     userSettings?.openaiKey,
    geminiKey:     userSettings?.geminiKey,
    ollamaHost:    userSettings?.ollamaHost,
    ollamaModel:   userSettings?.ollamaModel,
    abacusApiKey:  userSettings?.abacusApiKey,
    abacusEndpoint: userSettings?.abacusEndpoint,
  };
}

const TOKEN_LIMITS: Record<TaskComplexity, number> = {
  simple:   512,
  medium:   1024,
  complex:  4096,
  research: 8192,
};

// ── Agent task-type declarations ─────────────────────────────────────────────

export const AGENT_TASK_TYPES: Record<string, TaskType> = {
  ceoAgent:            "light_task",       // status summaries, delegation notes
  devAgent:            "coding",           // scripts, automation, code patches
  hardwareFundAgent:   "financial",        // fund tracking, financial summaries
  marketingAgent:      "social_content",   // posts, captions, campaigns
  inboxAgent:          "email_draft",      // email triage and draft replies
  upworkScoutAgent:    "light_task",       // job scoring, quick categorization
  grantArchitectAgent: "grant_writing",    // full grant narratives
  jobExecutorAgent:    "coding",           // deliverable code/scripts
  marketResearchAgent: "research",         // web-grounded market analysis
};

// ── Context builder (unchanged) ───────────────────────────────────────────────

export function buildAgentContext(agentId: string, orgContext: {
  orgName?: string;
  mission?: string;
  focusAreas?: string;
  location?: string;
}): string {
  const base = orgContext.orgName
    ? `Organization: ${orgContext.orgName}${orgContext.location ? `, ${orgContext.location}` : ""}.\nMission: ${orgContext.mission ?? "Technology and education nonprofit"}.`
    : "Organization: Runway Tech Education Nonprofit, Winston-Salem, NC.\nMission: Cybersecurity, AI literacy, and STEM education.";

  const needsFocus = ["grantArchitectAgent", "marketResearchAgent", "marketingAgent", "ceoAgent"].includes(agentId);
  const focusLine = needsFocus && orgContext.focusAreas ? `\nFocus areas: ${orgContext.focusAreas}.` : "";

  return base + focusLine;
}
