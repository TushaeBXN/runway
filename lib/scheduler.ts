import cron from "node-cron";
import { runCEOAgent } from "@/lib/agents/ceoAgent";
import { runMarketingAgent } from "@/lib/agents/marketingAgent";
import { runDevAgent } from "@/lib/agents/devAgent";
import { runInboxAgent } from "@/lib/agents/inboxAgent";
import { runGrantArchitectAgent } from "@/lib/agents/grantArchitectAgent";
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/resend";
import { getProvider } from "@/lib/llm";

async function markAgentTasksCompleted(agentId: string, label: string) {
  try {
    const tasks = await prisma.task.findMany({
      where: { agentId, status: "in_progress" },
    });

    for (const task of tasks) {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "completed", completedAt: new Date() },
      });
      await prisma.activityLog.create({
        data: {
          agentId,
          label: `Task completed: ${task.title} (${label})`,
        },
      });
    }
  } catch (err) {
    console.error(`[Scheduler] Failed to mark tasks for ${agentId}:`, err);
  }
}

export async function runNightlyLoop(): Promise<void> {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  console.log(`[Runway] Starting nightly agent loop — ${date}`);

  // Step 1: CEO Agent
  const recentActivity = await prisma.activityLog.findMany({
    take: 10,
    orderBy: { time: "desc" },
  });
  const priorActivity = recentActivity.map((a) => a.label).join("; ") || "No prior activity";

  const ceoOutput = await runCEOAgent({
    date,
    orgName: "Runway Tech Education Nonprofit",
    priorActivity,
  });

  console.log("[Runway] CEO Agent complete. Priorities:", ceoOutput.priorities);

  // Step 2: Run secondary agents — parallel for Anthropic, sequential for Ollama
  // (Ollama handles one inference at a time; concurrent requests cause fetch failures)
  let marketingOutput, devOutput, inboxOutput;
  if (getProvider() === "ollama") {
    console.log("[Runway] Ollama mode — running agents sequentially");
    marketingOutput = await runMarketingAgent(ceoOutput.delegations["marketingAgent"] || "Create weekly content");
    devOutput = await runDevAgent(ceoOutput.delegations["devAgent"] || "Review platform health");
    inboxOutput = await runInboxAgent(ceoOutput.delegations["inboxAgent"] || "Draft pending replies");
  } else {
    [marketingOutput, devOutput, inboxOutput] = await Promise.all([
      runMarketingAgent(ceoOutput.delegations["marketingAgent"] || "Create weekly content"),
      runDevAgent(ceoOutput.delegations["devAgent"] || "Review platform health"),
      runInboxAgent(ceoOutput.delegations["inboxAgent"] || "Draft pending replies"),
    ]);
  }

  console.log("[Runway] Secondary agents complete.");

  // Mark tasks completed for each agent
  await markAgentTasksCompleted("marketingAgent", "Marketing agent nightly run");
  await markAgentTasksCompleted("devAgent", "Dev agent nightly run");
  await markAgentTasksCompleted("inboxAgent", "Inbox agent nightly run");

  // Step 3: Grant Architect (independent)
  const grantOutput = await runGrantArchitectAgent();

  console.log("[Runway] Grant Architect complete. Top pick:", grantOutput.topPick);

  // Step 4: Build morning report
  const topGrant = grantOutput.opportunities.find(
    (o) => o.title === grantOutput.topPick
  ) || grantOutput.opportunities[0];

  const flaggedItem =
    inboxOutput.flagged[0] || "No items flagged for human review";

  const completedCounts = {
    "CEO Agent": 1,
    "Marketing Agent": 1,
    "Dev Agent": devOutput.length,
    "Inbox Agent": inboxOutput.emails.length,
    "Grant Architect": grantOutput.opportunities.length,
  };

  const reportDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; background: #F5F5F7; margin: 0; padding: 24px; }
    .card { background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.07); }
    h1 { color: #1D1D1F; font-size: 24px; margin: 0 0 4px; }
    h2 { color: #1D1D1F; font-size: 16px; margin: 0 0 12px; }
    p { color: #6E6E73; margin: 4px 0; font-size: 14px; }
    .score { display: inline-block; background: #34C759; color: #fff; border-radius: 8px; padding: 2px 10px; font-weight: 600; font-size: 14px; }
    .priority { color: #1D1D1F; font-size: 14px; margin: 4px 0; }
    .flag { background: #FFF3CD; border-radius: 8px; padding: 12px 16px; color: #856404; font-size: 14px; }
    .cta { display: inline-block; background: #1D1D1F; color: #fff; border-radius: 10px; padding: 10px 20px; text-decoration: none; font-size: 14px; font-weight: 500; margin-top: 12px; }
    .subtitle { color: #8E8E93; font-size: 13px; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto;">
    <div class="card">
      <h1>Runway Morning Report</h1>
      <p class="subtitle">${reportDate}</p>

      <h2>Top Grant Match</h2>
      <p><strong>${topGrant.title}</strong> — ${topGrant.funder}</p>
      <p>Amount: ${topGrant.amount} &nbsp; Deadline: ${topGrant.deadline}</p>
      <span class="score">${topGrant.missionScore}/10 Mission Match</span>
    </div>

    <div class="card">
      <h2>CEO Priorities for Today</h2>
      ${ceoOutput.priorities.map((p, i) => `<p class="priority">${i + 1}. ${p}</p>`).join("")}
      <p style="margin-top: 12px; font-style: italic; color: #8E8E93;">${ceoOutput.summary}</p>
    </div>

    <div class="card">
      <h2>Agent Activity</h2>
      ${Object.entries(completedCounts)
        .map(([agent, count]) => `<p>✓ <strong>${agent}</strong>: ${count} task${count !== 1 ? "s" : ""} completed</p>`)
        .join("")}
    </div>

    <div class="card">
      <h2>Flagged for Human Review</h2>
      <div class="flag">⚠️ ${flaggedItem}</div>
    </div>

    <div class="card" style="text-align: center;">
      <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard" class="cta">
        Open Runway Dashboard →
      </a>
    </div>
  </div>
</body>
</html>`;

  // Step 5: Send email (optional — only runs if RESEND_API_KEY is set)
  if (process.env.RESEND_API_KEY && process.env.USER_EMAIL) {
    try {
      await getResend().emails.send({
        from: "Runway <onboarding@resend.dev>",
        to: process.env.USER_EMAIL,
        subject: `Runway Morning Report — ${reportDate}`,
        html: emailHtml,
      });
      console.log("[Runway] Morning report sent.");
    } catch (err) {
      console.error("[Runway] Email send failed:", err);
    }
  } else {
    console.log("[Runway] Email skipped — RESEND_API_KEY or USER_EMAIL not set.");
  }

  console.log("[Runway] Nightly loop complete.");
}

let scheduled = false;

export function initScheduler(): void {
  if (scheduled) return;
  scheduled = true;

  cron.schedule("0 2 * * *", () => {
    console.log("[Runway] Cron triggered — running nightly loop");
    runNightlyLoop().catch((err) =>
      console.error("[Runway] Nightly loop error:", err)
    );
  });

  console.log("[Runway] Scheduler registered — will run nightly at 2:00 AM");
}
