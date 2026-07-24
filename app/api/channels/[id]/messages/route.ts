export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMentions, dispatchAgentToChannel, agentDisplayName, routeWithAnne, agentRole } from "@/lib/channelAgent";
import { callLLM } from "@/lib/llm";
import { getRolePrompt } from "@/lib/agentRoles";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const messages = await prisma.channelMessage.findMany({
    where: { channelId: id },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { content, senderName = "You" } = await req.json();

  if (!content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  // Save the user message
  const userMsg = await prisma.channelMessage.create({
    data: {
      channelId: id,
      senderId: "user",
      senderType: "user",
      senderName,
      content: content.trim(),
      msgType: "text",
    },
  });

  const channel = await prisma.channel.findUnique({ where: { id } });

  // Status command: every main agent checks in with a personality-driven one-liner
  const trimmed = content.trim().toLowerCase();
  if (["status", "status report", "team update", "check in"].includes(trimmed)) {
    const statusAgents = ["ceoAgent", "marketingAgent", "grantArchitectAgent", "inboxAgent", "devAgent", "marketResearchAgent", "logisticsAgent", "customerSupportAgent", "bookkeepingAgent"];
    for (const agentId of statusAgents) {
      try {
        const rolePrompt = getRolePrompt(agentId);
        const statusLine = await callLLM(
          `${rolePrompt}\n\nYou are in a team chat. Respond in ONE sentence only — plain text, no JSON, no lists. Stay in character. Say what you're currently working on or ready to help with.`,
          "Quick status update for the team.",
          60,
          { json: false }
        );
        await prisma.channelMessage.create({
          data: {
            channelId: id,
            senderId: agentId,
            senderType: "agent",
            senderName: agentDisplayName(agentId),
            content: statusLine.trim(),
            msgType: "text",
          },
        });
      } catch { /* skip failing agent */ }
    }
    return NextResponse.json({ userMsg, agentMessages: [] });
  }

  let mentions = parseMentions(content);

  // DM or dedicated channel (has agentId): always route to the assigned agent
  if (channel?.agentId && mentions.length === 0) {
    mentions = [{ agentId: channel.agentId, task: content.trim() }];
  }

  // General channels with no @mention and no assigned agent: let Anne decide
  if (!channel?.agentId && mentions.length === 0) {
    const routed = await routeWithAnne(content.trim(), channel?.name ?? "general");
    if (routed) mentions = [{ agentId: routed, task: content.trim() }];
  }
  const agentMessages = [];

  for (const { agentId, task } of mentions) {
    if (!task) continue;
    try {
      const response = await dispatchAgentToChannel(agentId, task);
      const agentMsg = await prisma.channelMessage.create({
        data: {
          channelId: id,
          senderId: agentId,
          senderType: "agent",
          senderName: agentDisplayName(agentId),
          content: response.content,
          msgType: response.msgType,
          approvalStatus: response.approvalStatus ?? null,
          payload: response.payload ?? null,
          actionType: response.actionType ?? null,
        },
      });
      agentMessages.push(agentMsg);
    } catch (err) {
      const errMsg = await prisma.channelMessage.create({
        data: {
          channelId: id,
          senderId: agentId,
          senderType: "agent",
          senderName: agentDisplayName(agentId),
          content: `Sorry, I ran into an error: ${(err as Error).message}`,
          msgType: "text",
        },
      });
      agentMessages.push(errMsg);
    }
  }

  return NextResponse.json({ userMsg, agentMessages });
}
