/**
 * Engram client — connects Runway agents to the Engram memory bridge.
 * Falls back silently if the bridge isn't running, so agents still work
 * without memory (just less informed).
 */

const BRIDGE = "http://localhost:4200";

async function call(path: string, body?: unknown): Promise<unknown> {
  try {
    const res = await fetch(`${BRIDGE}${path}`, {
      method: body !== undefined ? "POST" : "GET",
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // bridge not running — silent fallback
  }
}

export async function engramAvailable(): Promise<boolean> {
  const r = await call("/health") as { status?: string } | null;
  return r?.status === "ok";
}

/**
 * Called at the start of every agent run.
 * Returns ~170 tokens of context the agent should know before it starts.
 */
export async function agentWakeUp(wing: string, agentRoom: string): Promise<string> {
  const r = await call("/wake_up", { wing, rebuild_l1: false }) as { context?: string } | null;
  if (r?.context) return r.context;

  // Fallback: load specific room context
  const room = await call("/load_room", { wing, room: agentRoom }) as { context?: string } | null;
  return room?.context ?? "";
}

/**
 * Called after a successful agent run to store what was learned.
 */
export async function agentRemember(opts: {
  wing: string;
  room: string;
  hall?: string;
  content: string;
  pinned?: boolean;
}): Promise<void> {
  await call("/add_memory", {
    wing: opts.wing,
    room: opts.room,
    hall: opts.hall ?? "facts",
    content: opts.content,
    pinned: opts.pinned ?? false,
  });
}

/**
 * Called after an approved action — stores it as a skill/pattern.
 * Pinned so it doesn't decay.
 */
export async function agentLearnFromApproval(opts: {
  wing: string;
  agentId: string;
  actionType: string;
  summary: string;
}): Promise<void> {
  await call("/add_memory", {
    wing: opts.wing,
    room: opts.agentId,
    hall: "discoveries",
    content: `[APPROVED ${opts.actionType.toUpperCase()}] ${opts.summary}`,
    pinned: true,
  });

  await call("/diary/write", {
    agent: opts.agentId,
    entry: `Approved: ${opts.summary}`,
    tags: [opts.actionType, "approved"],
  });
}

/**
 * Called after a rejected action — stores what NOT to repeat.
 */
export async function agentLearnFromRejection(opts: {
  wing: string;
  agentId: string;
  actionType: string;
  summary: string;
  userNote?: string;
}): Promise<void> {
  const note = opts.userNote ? ` User feedback: "${opts.userNote}"` : "";
  await call("/add_memory", {
    wing: opts.wing,
    room: opts.agentId,
    hall: "facts",
    content: `[REJECTED ${opts.actionType.toUpperCase()}] ${opts.summary}.${note} Do not repeat this approach.`,
    pinned: false,
  });
}

/**
 * Search the org's memory — useful for grant architect, inbox agent, etc.
 */
export async function agentSearch(opts: {
  wing: string;
  query: string;
  room?: string;
  n?: number;
}): Promise<string[]> {
  const r = await call("/search", {
    query: opts.query,
    wing: opts.wing,
    room: opts.room,
    n: opts.n ?? 5,
  }) as { results?: unknown[] } | null;

  if (!r?.results) return [];
  return r.results.map((item) =>
    typeof item === "string" ? item : JSON.stringify(item)
  );
}

/**
 * Ensure a Wing exists for this org on first run.
 */
export async function ensureOrgWing(orgName: string, mission: string): Promise<void> {
  await call("/create_wing", {
    name: orgSlug(orgName),
    description: mission,
  });
}

/**
 * Ensure an agent Room exists within the org Wing.
 */
export async function ensureAgentRoom(orgName: string, agentId: string, description: string): Promise<void> {
  await call("/create_room", {
    wing: orgSlug(orgName),
    name: agentId,
    description,
  });
}

export function orgSlug(orgName: string): string {
  return orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "runway";
}
