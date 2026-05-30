export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { agentId, status, durationMs, errorMsg } = await req.json();
  await prisma.agentPerformance.create({
    data: { agentId, status, durationMs: durationMs ?? null, errorMsg: errorMsg ?? null },
  });

  // Auto-probation: if last 5 runs are all errors, flag for review
  const recent = await prisma.agentPerformance.findMany({
    where: { agentId },
    orderBy: { ranAt: "desc" },
    take: 5,
  });

  if (recent.length >= 5 && recent.every(r => r.status === "error")) {
    const agent = await prisma.agentDefinition.findUnique({ where: { agentId } });
    if (agent && agent.status === "active" && !agent.isBuiltIn) {
      await prisma.agentDefinition.update({
        where: { agentId },
        data: { status: "probation" },
      });
      await prisma.activityLog.create({
        data: {
          agentId,
          label: `⚠️ ${agent.name} placed on probation — 5 consecutive errors`,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
