export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const { msgId } = await params;
  const { action, userNote } = await req.json(); // action: "approved" | "rejected"

  const msg = await prisma.channelMessage.findUnique({ where: { id: msgId } });
  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const updated = await prisma.channelMessage.update({
    where: { id: msgId },
    data: { approvalStatus: action === "approved" ? "approved" : "rejected" },
  });

  // Mirror to PendingApprovals for history
  if (msg.payload && msg.actionType) {
    await prisma.pendingApproval.create({
      data: {
        agentId: msg.senderId,
        agentName: msg.senderName,
        actionType: msg.actionType,
        title: `Channel draft — ${msg.actionType.replace("_", " ")}`,
        description: msg.content,
        payload: msg.payload,
        status: action === "approved" ? "approved" : "rejected",
        userNote: userNote ?? null,
        decidedAt: new Date(),
      },
    });
  }

  return NextResponse.json(updated);
}
