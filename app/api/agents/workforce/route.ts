export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUILT_IN_ROLES } from "@/lib/agentRoles";

// Seed built-in agent definitions on first call
async function ensureBuiltInAgents() {
  for (const role of BUILT_IN_ROLES) {
    await prisma.agentDefinition.upsert({
      where: { agentId: role.agentId },
      update: {
        name: role.name,
        role: role.role,
        capabilities: JSON.stringify(role.capabilities),
        schedule: role.schedule,
        employmentType: role.employmentType,
        isBuiltIn: true,
        status: "active",
      },
      create: {
        agentId: role.agentId,
        name: role.name,
        role: role.role,
        capabilities: JSON.stringify(role.capabilities),
        schedule: role.schedule,
        employmentType: role.employmentType,
        isBuiltIn: true,
        status: "active",
      },
    });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureBuiltInAgents();

  const agents = await prisma.agentDefinition.findMany({ orderBy: { createdAt: "asc" } });

  // Attach recent performance stats to each agent
  const withStats = await Promise.all(agents.map(async (agent) => {
    const runs = await prisma.agentPerformance.findMany({
      where: { agentId: agent.agentId },
      orderBy: { ranAt: "desc" },
      take: 20,
    });
    const total = runs.length;
    const errors = runs.filter(r => r.status === "error").length;
    const errorRate = total > 0 ? Math.round((errors / total) * 100) : 0;
    const lastRun = runs[0]?.ranAt ?? null;
    return { ...agent, capabilities: JSON.parse(agent.capabilities as string), total, errors, errorRate, lastRun };
  }));

  return NextResponse.json(withStats);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Spin up a new agent
  if (body.action === "hire") {
    const agentId = `custom_${Date.now()}`;
    const agent = await prisma.agentDefinition.create({
      data: {
        agentId,
        name: body.name,
        role: body.role,
        capabilities: JSON.stringify(body.capabilities ?? []),
        schedule: body.schedule ?? "manual",
        employmentType: body.employmentType ?? "temporary",
        isBuiltIn: false,
        status: "active",
        cronExpr: body.cronExpr ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "AGENT_HIRED",
        resource: agentId,
        detail: `New agent "${body.name}" created as ${body.employmentType ?? "temporary"}`,
      },
    });

    return NextResponse.json({ ok: true, agentId, agent });
  }

  // Fire / retire an agent
  if (body.action === "fire") {
    const agent = await prisma.agentDefinition.findUnique({ where: { agentId: body.agentId } });
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    if (agent.isBuiltIn) return NextResponse.json({ error: "Cannot retire a built-in agent" }, { status: 403 });

    await prisma.agentDefinition.update({
      where: { agentId: body.agentId },
      data: { status: "retired", retiredAt: new Date(), retiredReason: body.reason ?? "Retired by owner" },
    });

    await prisma.auditLog.create({
      data: {
        action: "AGENT_RETIRED",
        resource: body.agentId,
        detail: body.reason ?? "Retired by owner",
      },
    });

    return NextResponse.json({ ok: true });
  }

  // Put on probation
  if (body.action === "probation") {
    await prisma.agentDefinition.update({
      where: { agentId: body.agentId },
      data: { status: "probation" },
    });
    await prisma.auditLog.create({
      data: { action: "AGENT_PROBATION", resource: body.agentId, detail: body.reason },
    });
    return NextResponse.json({ ok: true });
  }

  // Reinstate
  if (body.action === "reinstate") {
    await prisma.agentDefinition.update({
      where: { agentId: body.agentId },
      data: { status: "active", retiredAt: null, retiredReason: null },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
