export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HARDWARE_TIERS } from "@/lib/agents/hardwareFundAgent";

export async function GET() {
  const fund = await prisma.hardwareFund.findFirst();
  const totalEarned = fund?.totalEarned ?? 0;
  const currentTier = fund?.currentTier ?? "tier0";

  const completedJobs = await prisma.upworkJob.count({ where: { status: "completed" } });
  const pendingJobs = await prisma.upworkJob.count({ where: { status: "pending" } });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentJobs = await prisma.upworkJob.findMany({
    where: { status: "completed", createdAt: { gte: sevenDaysAgo } },
  });
  const weeklyEarnings = recentJobs.reduce((sum: number, j: { earnings: number }) => sum + j.earnings, 0);

  const currentTierData = HARDWARE_TIERS.find((t) => t.id === currentTier) ?? HARDWARE_TIERS[0];
  const nextTierIndex = HARDWARE_TIERS.findIndex((t) => t.id === currentTier) + 1;
  const nextTier = nextTierIndex < HARDWARE_TIERS.length ? HARDWARE_TIERS[nextTierIndex] : null;

  const progressToNextTier = nextTier
    ? Math.min(
        100,
        Math.round(
          ((totalEarned - currentTierData.target) /
            (nextTier.target - currentTierData.target)) *
            100
        )
      )
    : 100;

  return NextResponse.json({
    totalEarned,
    currentTier,
    currentTierData,
    nextTier,
    progressToNextTier,
    completedJobs,
    pendingJobs,
    weeklyEarnings,
    tiers: HARDWARE_TIERS,
  });
}
