import { callLLM, parseJSON } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export interface JobExecutorOutput {
  jobId: string;
  title: string;
  deliverable: string;
  status: "completed" | "failed";
  estimatedEarnings: number;
}

export async function runJobExecutorAgent(): Promise<JobExecutorOutput[]> {
  // Pull all pending jobs scored >= 70, ordered by score desc, limit 3
  const pendingJobs = await prisma.upworkJob.findMany({
    where: { status: "pending", score: { gte: 70 } },
    orderBy: { score: "desc" },
    take: 3,
  });

  if (pendingJobs.length === 0) {
    await prisma.activityLog.create({
      data: {
        agentId: "jobExecutorAgent",
        label: "Job Executor: no qualifying jobs in queue — skipping execution",
      },
    });
    return [];
  }

  const results: JobExecutorOutput[] = [];

  for (const job of pendingJobs) {
    // Mark in progress
    await prisma.upworkJob.update({
      where: { id: job.id },
      data: { status: "in_progress" },
    });

    const systemPrompt = `You are a professional freelancer completing a paid Upwork job. Produce a complete, polished, client-ready deliverable. No placeholders. No "TODO" items. Every section must be fully written.

The deliverable must:
- Be immediately usable by the client without any editing
- Match the word count and format specified in the job description
- Be professional and publication-ready
- End with a brief note: "Delivered by Runway AI — Questions? Reply to this message."`;

    const userMessage = `Complete the following Upwork job in full:

JOB TITLE: ${job.title}
BUDGET: ${job.budget}
REQUIRED SKILLS: ${job.skills}
JOB DESCRIPTION: ${job.description}

Produce the complete, client-ready deliverable now. Do not describe what you will do — just do it. Return as a JSON object with keys:
- deliverable: the full completed work as a formatted string
- status: "completed"`;

    let deliverable = "";
    let jobStatus: "completed" | "failed" = "failed";
    let rawText = "";

    try {
      rawText = await callLLM(systemPrompt, userMessage, 4096);
      const parsed = parseJSON<{ deliverable: string; status: string }>(rawText);
      deliverable = parsed.deliverable || rawText;
      jobStatus = "completed";
    } catch {
      deliverable = `Job execution failed for: ${job.title}`;
      jobStatus = "failed";
    }

    // Parse estimated earnings from budget string (e.g. "$75" → 75)
    const earningsMatch = job.budget.replace(/,/g, "").match(/\$?([\d.]+)/);
    const estimatedEarnings = earningsMatch ? parseFloat(earningsMatch[1]) : 0;

    // Update job record
    await prisma.upworkJob.update({
      where: { id: job.id },
      data: {
        status: jobStatus,
        deliverable,
        earnings: jobStatus === "completed" ? estimatedEarnings : 0,
      },
    });

    // Update hardware fund
    if (jobStatus === "completed" && estimatedEarnings > 0) {
      const existing = await prisma.hardwareFund.findFirst();
      if (existing) {
        const newTotal = existing.totalEarned + estimatedEarnings;
        await prisma.hardwareFund.update({
          where: { id: existing.id },
          data: {
            totalEarned: newTotal,
            currentTier: getTier(newTotal),
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.hardwareFund.create({
          data: {
            totalEarned: estimatedEarnings,
            currentTier: getTier(estimatedEarnings),
          },
        });
      }
    }

    await prisma.activityLog.create({
      data: {
        agentId: "jobExecutorAgent",
        label: `Job Executor: "${job.title}" — ${jobStatus} (+$${estimatedEarnings})`,
      },
    });

    results.push({
      jobId: job.id,
      title: job.title,
      deliverable,
      status: jobStatus,
      estimatedEarnings,
    });
  }

  await prisma.agentRun.create({
    data: {
      agentId: "jobExecutorAgent",
      agentName: "Job Executor",
      status: results.some((r) => r.status === "completed") ? "success" : "error",
      output: JSON.stringify(results),
    },
  });

  return results;
}

function getTier(totalEarned: number): string {
  if (totalEarned >= 18000) return "tier3"; // NVIDIA Spark x2
  if (totalEarned >= 7500) return "tier2";  // Mac Studio M4 Ultra
  if (totalEarned >= 3500) return "tier1";  // MacBook Pro M4 Max
  return "tier0";                           // Current hardware
}
