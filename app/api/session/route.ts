export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Validates the Bearer token sent by ˈlo͞omən OS hooks
function authorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/, "");
  const expected = process.env.LOOMEN_TOKEN;
  if (!expected) return false;
  return token === expected;
}

// POST /api/session
// Called by ˈlo͞omən OS hooks.sh after each agent run.
// Body: { agent, last_run, run_count, memory: {}, log: [] }
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { agent, last_run, run_count, memory, log } = body;

  if (!agent) {
    return NextResponse.json({ error: "agent is required" }, { status: 400 });
  }

  const session = await prisma.agentSession.upsert({
    where: { agentId: agent },
    create: {
      agentId: agent,
      lastRun: last_run ? new Date(last_run) : null,
      runCount: run_count ?? 0,
      memory: JSON.stringify(memory ?? {}),
      log: JSON.stringify(log ?? []),
    },
    update: {
      lastRun: last_run ? new Date(last_run) : undefined,
      runCount: run_count ?? undefined,
      memory: JSON.stringify(memory ?? {}),
      log: JSON.stringify(log ?? []),
    },
  });

  return NextResponse.json({ ok: true, id: session.id });
}

// GET /api/session?agent=Vesper
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = req.nextUrl.searchParams.get("agent");

  if (agent) {
    const session = await prisma.agentSession.findUnique({
      where: { agentId: agent },
    });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      ...session,
      memory: JSON.parse(session.memory),
      log: JSON.parse(session.log),
    });
  }

  const all = await prisma.agentSession.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(
    all.map((s) => ({ ...s, memory: JSON.parse(s.memory), log: JSON.parse(s.log) }))
  );
}
