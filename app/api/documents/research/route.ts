import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runMarketResearchAgent } from "@/lib/agents/marketResearchAgent";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { orgProfile: true },
  });

  if (!user?.orgProfile) {
    return NextResponse.json({ error: "No org profile found. Complete onboarding first." }, { status: 400 });
  }

  // Run in background — respond immediately
  runMarketResearchAgent(user.orgProfile, userId).catch(console.error);

  return NextResponse.json({ ok: true, message: "Market research started — check Documents in ~30 seconds." });
}
