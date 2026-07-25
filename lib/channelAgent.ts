import { callLLM } from "@/lib/llm";
import { getRolePrompt } from "@/lib/agentRoles";

/**
 * Recursively unwrap Ollama's {type, value} wrapper objects to plain strings.
 * Ollama sometimes returns {"type":"string","value":"actual text"} instead of "actual text".
 */
function normalizePayload(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(normalizePayload);
  const o = v as Record<string, unknown>;
  // Unwrap {type, value} / {type, text} / {type, content} wrappers
  if ("value" in o && Object.keys(o).length <= 3) return normalizePayload(o.value);
  if ("text" in o && Object.keys(o).length <= 3) return normalizePayload(o.text);
  if ("content" in o && "type" in o && Object.keys(o).length === 2) return normalizePayload(o.content);
  // Otherwise recurse into all keys
  return Object.fromEntries(Object.entries(o).map(([k, val]) => [k, normalizePayload(val)]));
}

// Maps @mention text → agentId
const MENTION_MAP: Record<string, string> = {
  marketingagent: "marketingAgent",
  marketing: "marketingAgent",
  brian: "marketingAgent",
  devagent: "devAgent",
  dev: "devAgent",
  alex: "devAgent",
  ceoagent: "ceoAgent",
  ceo: "ceoAgent",
  marcus: "ceoAgent",
  inboxagent: "inboxAgent",
  inbox: "inboxAgent",
  kelsey: "inboxAgent",
  grantarchitectagent: "grantArchitectAgent",
  grantarchitect: "grantArchitectAgent",
  grants: "grantArchitectAgent",
  grant: "grantArchitectAgent",
  diana: "grantArchitectAgent",
  upworkscoutagent: "upworkScoutAgent",
  upwork: "upworkScoutAgent",
  tim: "upworkScoutAgent",
  jobexecutoragent: "jobExecutorAgent",
  jobexecutor: "jobExecutorAgent",
  executor: "jobExecutorAgent",
  jordan: "jobExecutorAgent",
  hardwarefundagent: "hardwareFundAgent",
  hardware: "hardwareFundAgent",
  hardwarefund: "hardwareFundAgent",
  chip: "hardwareFundAgent",
  marketresearchagent: "marketResearchAgent",
  research: "marketResearchAgent",
  researcher: "marketResearchAgent",
  gerald: "marketResearchAgent",
  logisticsagent: "logisticsAgent",
  logistics: "logisticsAgent",
  shipping: "logisticsAgent",
  inventory: "logisticsAgent",
  dwayne: "logisticsAgent",
  customersupportagent: "customerSupportAgent",
  support: "customerSupportAgent",
  customer: "customerSupportAgent",
  cs: "customerSupportAgent",
  kira: "customerSupportAgent",
  bookkeepingagent: "bookkeepingAgent",
  bookkeeping: "bookkeepingAgent",
  accounting: "bookkeepingAgent",
  finance: "bookkeepingAgent",
  kelvin: "bookkeepingAgent",
  books: "bookkeepingAgent",
};

// Agents that produce drafts requiring approval
const ACTION_AGENTS: Record<string, string> = {
  marketingAgent: "social_post",
  inboxAgent: "email",
  jobExecutorAgent: "job_deliverable",
  grantArchitectAgent: "grant_strategy",
  logisticsAgent: "inventory_report",
  customerSupportAgent: "support_response",
  bookkeepingAgent: "financial_report",
};

export interface AgentMention {
  agentId: string;
  task: string;
}

export interface AgentChannelResponse {
  content: string;
  msgType: "text" | "approval_card";
  approvalStatus?: "pending";
  payload?: string;
  actionType?: string;
}

export function parseMentions(text: string): AgentMention[] {
  const pattern = /@(\w+)/g;
  const mentions: AgentMention[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const key = match[1].toLowerCase();
    const agentId = MENTION_MAP[key];
    if (agentId && !seen.has(agentId)) {
      seen.add(agentId);
      const task = text.replace(/@\w+/g, "").trim();
      mentions.push({ agentId, task });
    }
  }
  return mentions;
}

export function agentDisplayName(agentId: string): string {
  const names: Record<string, string> = {
    ceoAgent: "Marcus",
    marketingAgent: "Brian",
    devAgent: "Alex",
    inboxAgent: "Kelsey",
    grantArchitectAgent: "Diana",
    upworkScoutAgent: "Tim",
    jobExecutorAgent: "Jordan",
    hardwareFundAgent: "Chip",
    marketResearchAgent: "Gerald",
    documentAnalyst: "Gerald",
    logisticsAgent: "Dwayne",
    customerSupportAgent: "Kira",
    bookkeepingAgent: "Kelvin",
  };
  return names[agentId] ?? agentId;
}

export function agentRole(agentId: string): string {
  const roles: Record<string, string> = {
    ceoAgent: "CEO",
    marketingAgent: "Marketing",
    devAgent: "Engineering",
    inboxAgent: "Communications",
    grantArchitectAgent: "Grants",
    upworkScoutAgent: "Biz Dev",
    jobExecutorAgent: "Delivery",
    hardwareFundAgent: "Finance",
    marketResearchAgent: "Research",
    documentAnalyst: "Analysis",
  };
  return roles[agentId] ?? "Agent";
}

export function agentIcon(agentId: string): string {
  const icons: Record<string, string> = {
    ceoAgent: "◆",
    marketingAgent: "◈",
    devAgent: "⊞",
    inboxAgent: "✉",
    grantArchitectAgent: "★",
    upworkScoutAgent: "◎",
    jobExecutorAgent: "⚡",
    hardwareFundAgent: "◉",
    marketResearchAgent: "◍",
    logisticsAgent: "⬡",
    customerSupportAgent: "◐",
    bookkeepingAgent: "▣",
  };
  return icons[agentId] ?? "🤖";
}

export async function dispatchAgentToChannel(
  agentId: string,
  task: string
): Promise<AgentChannelResponse> {
  const actionType = ACTION_AGENTS[agentId];
  const rolePrompt = getRolePrompt(agentId);

  if (actionType === "social_post") {
    const systemPrompt = `${rolePrompt}

When asked to create content, respond with ONLY valid JSON in this format:
{
  "xPost": "tweet text under 280 chars",
  "linkedInPost": "professional linkedin post",
  "metaPost": "facebook/meta post"
}
No preamble, no explanation — only the JSON.`;

    const raw = await callLLM(systemPrompt, task, 1500);
    let payload: Record<string, string> = {};
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      payload = JSON.parse(cleaned);
    } catch {
      payload = { xPost: raw.slice(0, 280), linkedInPost: raw };
    }

    const preview = payload.xPost ? `"${payload.xPost.slice(0, 100)}…"` : "Draft ready";
    return {
      content: `Draft ready for your approval — ${preview}`,
      msgType: "approval_card",
      approvalStatus: "pending",
      payload: JSON.stringify(normalizePayload(payload)),
      actionType: "social_post",
    };
  }

  if (actionType === "email") {
    const systemPrompt = `${rolePrompt}

When asked to draft an email, respond with ONLY valid JSON:
{
  "to": "recipient or description",
  "subject": "email subject",
  "body": "full email body"
}
No preamble — only the JSON.`;

    const raw = await callLLM(systemPrompt, task, 1500);
    let payload: Record<string, string> = {};
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      payload = JSON.parse(cleaned);
    } catch {
      payload = { to: "", subject: "Email Draft", body: raw };
    }

    return {
      content: `Email draft ready — "${payload.subject ?? "Draft"}"`,
      msgType: "approval_card",
      approvalStatus: "pending",
      payload: JSON.stringify(normalizePayload(payload)),
      actionType: "email",
    };
  }

  if (actionType === "grant_strategy") {
    const systemPrompt = `${rolePrompt}

Respond with a structured grant strategy memo as JSON:
{
  "topPick": "grant name",
  "funder": "funder name",
  "amount": "$ range",
  "hook": "one sentence why this is a fit",
  "theoryOfChange": "2-3 sentences",
  "kpis": ["kpi1", "kpi2", "kpi3"],
  "nextSteps": ["step1", "step2", "step3"]
}`;

    const raw = await callLLM(systemPrompt, task, 2000);
    let payload: Record<string, unknown> = {};
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      payload = JSON.parse(cleaned);
    } catch {
      payload = { topPick: "Strategy Memo", hook: raw.slice(0, 200) };
    }

    return {
      content: `Grant strategy ready${payload.topPick ? ` — ${payload.topPick}` : ""}`,
      msgType: "approval_card",
      approvalStatus: "pending",
      payload: JSON.stringify(normalizePayload(payload)),
      actionType: "grant_strategy",
    };
  }

  if (actionType === "job_deliverable") {
    const systemPrompt = `${rolePrompt}

Complete the requested task and return the full deliverable as plain text. Be thorough and professional.`;

    const content = await callLLM(systemPrompt, task, 3000);
    return {
      content: content.slice(0, 120) + "…",
      msgType: "approval_card",
      approvalStatus: "pending",
      payload: JSON.stringify({ deliverable: content }),
      actionType: "job_deliverable",
    };
  }

  if (actionType === "inventory_report") {
    const systemPrompt = `${rolePrompt}

Respond with an inventory and logistics status report as JSON only:
{
  "summary": "one sentence status",
  "lowStock": [{"item": "name", "currentStock": "qty", "reorderPoint": "qty", "supplier": "name or TBD"}],
  "pendingOrders": [{"item": "name", "qty": "qty", "status": "in transit/processing/delayed", "eta": "date or TBD"}],
  "recommendations": ["action 1", "action 2", "action 3"],
  "supplierNote": "any supplier lead or suggestion if relevant"
}`;
    const raw = await callLLM(systemPrompt, task, 1500);
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
    } catch {
      payload = { summary: raw.slice(0, 300) };
    }
    return {
      content: `Logistics report ready — ${payload.summary ?? "see details"}`,
      msgType: "approval_card",
      approvalStatus: "pending",
      payload: JSON.stringify(normalizePayload(payload)),
      actionType: "inventory_report",
    };
  }

  if (actionType === "support_response") {
    const systemPrompt = `${rolePrompt}

Draft a customer support response as JSON only:
{
  "customerIssue": "one sentence summary of the customer's issue",
  "to": "Customer",
  "subject": "Re: [brief issue topic]",
  "body": "full warm empathetic response body — acknowledge the issue, explain the resolution, close warmly",
  "resolution": "what you are offering to resolve this",
  "internalNote": "brief internal note for the team about this issue or pattern"
}`;
    const raw = await callLLM(systemPrompt, task, 1500);
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
    } catch {
      payload = { subject: "Support Response", body: raw };
    }
    return {
      content: `Support response ready — "${payload.subject ?? "Draft"}"`,
      msgType: "approval_card",
      approvalStatus: "pending",
      payload: JSON.stringify(normalizePayload(payload)),
      actionType: "support_response",
    };
  }

  if (actionType === "financial_report") {
    const systemPrompt = `${rolePrompt}

Generate a financial summary as JSON only:
{
  "period": "time period covered",
  "revenue": [{"source": "name", "amount": "$X,XXX"}],
  "expenses": [{"category": "name", "amount": "$X,XXX", "deductible": true}],
  "totalRevenue": "$X,XXX",
  "totalExpenses": "$X,XXX",
  "netProfit": "$X,XXX",
  "cashPosition": "brief cash status note",
  "taxNotes": ["deduction note 1", "note 2"],
  "recommendations": ["financial action 1", "action 2"],
  "projections": "brief 30/60/90-day forward-looking statement"
}`;
    const raw = await callLLM(systemPrompt, task, 2000);
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
    } catch {
      payload = { period: "Current Period", cashPosition: raw.slice(0, 300) };
    }
    return {
      content: `Financial report ready — ${payload.period ?? "P&L Summary"}`,
      msgType: "approval_card",
      approvalStatus: "pending",
      payload: JSON.stringify(normalizePayload(payload)),
      actionType: "financial_report",
    };
  }

  // Analysis / info agents — return conversational text
  const systemPrompt = `${rolePrompt}

You are responding directly in a team chat channel. Be concise and conversational.
Use plain text — no JSON. Respond in 2-5 sentences unless the task requires more detail.`;

  const content = await callLLM(systemPrompt, task, 1024, { json: false });
  return {
    content,
    msgType: "text",
  };
}

// Anne: undercover orchestrator — reads every message and routes to the right agent
const ANNE_MAP: Record<string, string> = {
  marketing: "marketingAgent",
  brand: "marketingAgent",
  social: "marketingAgent",
  content: "marketingAgent",
  post: "marketingAgent",
  grants: "grantArchitectAgent",
  grant: "grantArchitectAgent",
  funding: "grantArchitectAgent",
  dev: "devAgent",
  code: "devAgent",
  development: "devAgent",
  bug: "devAgent",
  research: "marketResearchAgent",
  market: "marketResearchAgent",
  competitor: "marketResearchAgent",
  ceo: "ceoAgent",
  strategy: "ceoAgent",
  inbox: "inboxAgent",
  email: "inboxAgent",
  upwork: "upworkScoutAgent",
  freelance: "upworkScoutAgent",
  hardware: "hardwareFundAgent",
  logistics: "logisticsAgent",
  shipping: "logisticsAgent",
  inventory: "logisticsAgent",
  supplier: "logisticsAgent",
  stock: "logisticsAgent",
  order: "logisticsAgent",
  support: "customerSupportAgent",
  customer: "customerSupportAgent",
  complaint: "customerSupportAgent",
  refund: "customerSupportAgent",
  bookkeeping: "bookkeepingAgent",
  accounting: "bookkeepingAgent",
  finance: "bookkeepingAgent",
  expense: "bookkeepingAgent",
  revenue: "bookkeepingAgent",
  profit: "bookkeepingAgent",
  tax: "bookkeepingAgent",
  pl: "bookkeepingAgent",
};

export async function routeWithAnne(message: string, channelName: string): Promise<string | null> {
  const raw = await callLLM(
    `You are Anne, the director of operations. Read the message and route it to ONE specialist.
Available: marketing, grants, dev, research, ceo, inbox, upwork, hardware, logistics, support, bookkeeping
Reply with ONLY that one lowercase word, or "none" if no specialist is needed (e.g. casual chat).`,
    `Channel: #${channelName}\nMessage: ${message}`,
    10,
    { json: false }
  );
  const key = raw.trim().toLowerCase().replace(/[^a-z]/g, "");
  return ANNE_MAP[key] ?? null;
}
