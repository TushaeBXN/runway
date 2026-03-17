import { callLLM, parseJSON } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export const HARDWARE_TIERS = [
  {
    id: "tier0",
    label: "Current Hardware",
    description: "M-series MacBook — baseline operations",
    target: 0,
    color: "#8E8E93",
  },
  {
    id: "tier1",
    label: "MacBook Pro M4 Max",
    description: "128GB RAM — faster inference, more parallel agents",
    target: 3500,
    color: "#007AFF",
  },
  {
    id: "tier2",
    label: "Mac Studio M4 Ultra",
    description: "Maxed out — dedicated agent server, full-time autonomy",
    target: 7500,
    color: "#34C759",
  },
  {
    id: "tier3",
    label: "NVIDIA Spark ×2",
    description: "Dual AI supercomputers — maximum inference power",
    target: 18000,
    color: "#FF9500",
  },
];

export interface HardwareFundStatus {
  totalEarned: number;
  currentTier: string;
  nextTier: typeof HARDWARE_TIERS[number] | null;
  progressToNextTier: number;
  completedJobs: number;
  pendingJobs: number;
  weeklyEarnings: number;
  report: string;
}

export async function runHardwareFundAgent(): Promise<HardwareFundStatus> {
  const fund = await prisma.hardwareFund.findFirst();
  const totalEarned = fund?.totalEarned ?? 0;
  const currentTier = fund?.currentTier ?? "tier0";

  const completedJobs = await prisma.upworkJob.count({ where: { status: "completed" } });
  const pendingJobs = await prisma.upworkJob.count({ where: { status: "pending" } });

  // Weekly earnings: jobs completed in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentJobs = await prisma.upworkJob.findMany({
    where: { status: "completed", createdAt: { gte: sevenDaysAgo } },
  });
  const weeklyEarnings = recentJobs.reduce((sum, j) => sum + j.earnings, 0);

  const currentTierData = HARDWARE_TIERS.find((t) => t.id === currentTier) ?? HARDWARE_TIERS[0];
  const nextTierIndex = HARDWARE_TIERS.findIndex((t) => t.id === currentTier) + 1;
  const nextTier = nextTierIndex < HARDWARE_TIERS.length ? HARDWARE_TIERS[nextTierIndex] : null;

  const progressToNextTier = nextTier
    ? Math.min(100, Math.round(((totalEarned - currentTierData.target) / (nextTier.target - currentTierData.target)) * 100))
    : 100;

  const systemPrompt = `You are the Hardware Fund Agent for an autonomous AI team. You track freelance earnings and report progress toward hardware upgrades. Be concise and motivating.`;

  const userMessage = `Generate a 2-sentence hardware fund status report.

Total earned: $${totalEarned.toFixed(2)}
Current tier: ${currentTierData.label}
Next tier: ${nextTier ? `${nextTier.label} ($${nextTier.target})` : "Maximum tier reached"}
Progress to next tier: ${progressToNextTier}%
Completed jobs: ${completedJobs}
Weekly earnings: $${weeklyEarnings.toFixed(2)}

Return JSON: { "report": "..." }`;

  let report = `Hardware fund at $${totalEarned.toFixed(2)} — ${progressToNextTier}% toward ${nextTier?.label ?? "final tier"}.`;

  try {
    const raw = await callLLM(systemPrompt, userMessage, 512);
    const parsed = parseJSON<{ report: string }>(raw);
    report = parsed.report || report;
  } catch {
    // keep fallback report
  }

  await prisma.activityLog.create({
    data: {
      agentId: "hardwareFundAgent",
      label: `Hardware Fund: $${totalEarned.toFixed(2)} earned — ${progressToNextTier}% to ${nextTier?.label ?? "max tier"}`,
    },
  });

  return {
    totalEarned,
    currentTier,
    nextTier,
    progressToNextTier,
    completedJobs,
    pendingJobs,
    weeklyEarnings,
    report,
  };
}
