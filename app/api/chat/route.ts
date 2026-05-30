export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { callLLMChat } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json();

  const [recentRuns, recentGrants] = await Promise.all([
    prisma.agentRun.findMany({ take: 5, orderBy: { ranAt: "desc" } }),
    prisma.grantOpportunity.findMany({ take: 3, orderBy: { missionScore: "desc" } }),
  ]);

  const agentContext = recentRuns
    .map((r) => `${r.agentName} (${r.status}): ${r.output.slice(0, 300)}`)
    .join("\n\n");

  const grantContext = recentGrants
    .map((g) => `${g.title} — ${g.funder} — Score: ${g.missionScore}/10`)
    .join("\n");

  const systemPrompt = `You are the Runway AI assistant for a technology and education nonprofit in Winston-Salem, NC. You have full context of the platform's agent activity.

Recent Agent Runs:
${agentContext || "No recent runs."}

Top Grant Opportunities:
${grantContext || "No grants found yet."}

Answer questions about agent activity, grants, marketing content, development tasks, and organizational strategy. Be concise and actionable.`;

  const messages = [
    ...history.map((h: { role: string; content: string }) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user" as const, content: message },
  ];

  const reply = await callLLMChat(systemPrompt, messages, 1024);

  await prisma.chatMessage.createMany({
    data: [
      { role: "user", content: message },
      { role: "assistant", content: reply },
    ],
  });

  return NextResponse.json({ reply });
}
