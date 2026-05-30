export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agentLearnFromApproval, agentLearnFromRejection, orgSlug } from "@/lib/engram";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action, userNote } = await req.json();

  const approval = await prisma.pendingApproval.update({
    where: { id },
    data: {
      status: action,
      userNote: userNote ?? null,
      decidedAt: new Date(),
    },
  });

  await prisma.activityLog.create({
    data: {
      agentId: approval.agentId,
      label: `"${approval.title}" — ${action === "approved" ? "✓ Approved" : "✗ Rejected"}${userNote ? `: ${userNote}` : ""}`,
    },
  });

  // Teach Engram what worked and what didn't
  const wing = orgSlug("Runway Tech Education Nonprofit");
  if (action === "approved") {
    await agentLearnFromApproval({
      wing,
      agentId: approval.agentId,
      actionType: approval.actionType,
      summary: `${approval.title} — ${approval.description}`,
    });
  } else {
    await agentLearnFromRejection({
      wing,
      agentId: approval.agentId,
      actionType: approval.actionType,
      summary: `${approval.title} — ${approval.description}`,
      userNote: userNote ?? undefined,
    });
  }

  return NextResponse.json({ ok: true });
}
