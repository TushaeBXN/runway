export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_CHANNELS = [
  { name: "general",    description: "Team-wide updates and discussion",              type: "channel" },
  { name: "marketing",  description: "Brian handles content and social media",        type: "channel", agentId: "marketingAgent" },
  { name: "grants",     description: "Diana researches and strategies grant funding", type: "channel", agentId: "grantArchitectAgent" },
  { name: "dev",        description: "Alex reviews platform health and bugs",         type: "channel", agentId: "devAgent" },
  { name: "research",   description: "Gerald finds market opportunities",             type: "channel", agentId: "marketResearchAgent" },
  { name: "logistics",  description: "Dwayne manages inventory and shipping",         type: "channel", agentId: "logisticsAgent" },
  { name: "support",    description: "Kira handles customer inquiries",               type: "channel", agentId: "customerSupportAgent" },
  { name: "finance",    description: "Kelvin tracks books, P&L, and expenses",       type: "channel", agentId: "bookkeepingAgent" },
];

const DM_AGENTS = [
  { name: "Marcus (CEO)",      agentId: "ceoAgent" },
  { name: "Kelsey (Inbox)",    agentId: "inboxAgent" },
  { name: "Tim (Upwork)",      agentId: "upworkScoutAgent" },
  { name: "Dwayne (Logistics)",agentId: "logisticsAgent" },
  { name: "Kira (Support)",    agentId: "customerSupportAgent" },
  { name: "Kelvin (Finance)",  agentId: "bookkeepingAgent" },
];

export async function GET() {
  const existing = await prisma.channel.findMany({ orderBy: { createdAt: "asc" } });
  const existingKeys = new Set(existing.map((c) => `${c.type}:${c.agentId ?? c.name}`));

  const allToSeed = [
    ...DEFAULT_CHANNELS,
    ...DM_AGENTS.map((a) => ({ name: a.name, type: "dm", agentId: a.agentId })),
  ];

  const missing = allToSeed.filter((c) => {
    const key = `${c.type ?? "channel"}:${c.agentId ?? c.name}`;
    return !existingKeys.has(key);
  });

  if (missing.length > 0) {
    await prisma.channel.createMany({ data: missing });
  }

  return NextResponse.json(
    await prisma.channel.findMany({ orderBy: { createdAt: "asc" } })
  );
}

export async function POST(req: Request) {
  const body = await req.json();
  const channel = await prisma.channel.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      type: body.type ?? "channel",
      agentId: body.agentId ?? null,
    },
  });
  return NextResponse.json(channel);
}
