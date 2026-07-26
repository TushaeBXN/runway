import cron from "node-cron";
import { runCEOAgent } from "@/lib/agents/ceoAgent";
import { runMarketingAgent } from "@/lib/agents/marketingAgent";
import { runDevAgent } from "@/lib/agents/devAgent";
import { runInboxAgent } from "@/lib/agents/inboxAgent";
import { runGrantArchitectAgent } from "@/lib/agents/grantArchitectAgent";
import { runUpworkScoutAgent } from "@/lib/agents/upworkScoutAgent";
import { runJobExecutorAgent } from "@/lib/agents/jobExecutorAgent";
import { runHardwareFundAgent } from "@/lib/agents/hardwareFundAgent";
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/resend";
import { getBoardReportData } from "@/lib/boardReportData";
import { getProvider } from "@/lib/llm";
import { DEFAULT_SCHEDULE, toCronExpressions, type ScheduleConfig } from "@/lib/agentSchedule";
import { routeModel, buildAgentContext, AGENT_COMPLEXITY } from "@/lib/modelRouter";
import {
  agentWakeUp,
  agentRemember,
  ensureOrgWing,
  ensureAgentRoom,
  orgSlug,
  engramAvailable,
} from "@/lib/engram";

// ── Cron logger ──────────────────────────────────────────────────
// Writes to activityLog so every cron run is visible in the dashboard.
async function logCron(job: string, status: "start" | "success" | "error", detail?: string) {
  const icon  = status === "start" ? "⏱" : status === "success" ? "✓" : "✗";
  const label = `${icon} Cron [${job}]${detail ? `: ${detail}` : ""}`;
  console.log(`[Scheduler] ${label}`);
  try {
    await prisma.activityLog.create({ data: { agentId: "system", label } });
  } catch { /* never throw from a logger */ }
}

// ── Cron wrapper ─────────────────────────────────────────────────
// Runs an async job, logging start/success/error to activityLog.
function cronJob(name: string, fn: () => Promise<void>): () => void {
  return () => {
    logCron(name, "start")
      .then(() => fn())
      .then(() => logCron(name, "success"))
      .catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        logCron(name, "error", detail).catch(() => {});
      });
  };
}

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

export async function runNightlyLoop(orgName = "Runway Tech Education Nonprofit"): Promise<void> {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const wing = orgSlug(orgName);

  console.log(`[Runway] Starting agent loop — ${date}`);

  // ── Engram: ensure org Wing + agent Rooms exist ──────────────────
  const memoryOnline = await engramAvailable();
  if (memoryOnline) {
    console.log("[Runway] Engram memory online ✓");
    await ensureOrgWing(orgName, "Nonprofit AI operations platform");
    for (const [id, desc] of [
      ["ceoAgent", "CEO priorities and delegations"],
      ["marketingAgent", "Social media drafts and brand voice"],
      ["devAgent", "Platform health and improvements"],
      ["inboxAgent", "Email drafts and donor/partner communication"],
      ["grantArchitectAgent", "Grant research and strategy memos"],
      ["upworkScoutAgent", "Freelance job scouting"],
      ["jobExecutorAgent", "Job execution and deliverables"],
    ] as [string, string][]) {
      await ensureAgentRoom(orgName, id, desc);
    }
  } else {
    console.log("[Runway] Engram bridge not running — agents will work without memory");
  }

  // ── Step 1: CEO Agent with memory context ──────────────────────
  const recentActivity = await prisma.activityLog.findMany({
    take: 10,
    orderBy: { time: "desc" },
  });
  const priorActivity = recentActivity.map((a) => a.label).join("; ") || "No prior activity";
  const ceoMemory = memoryOnline ? await agentWakeUp(wing, "ceoAgent") : "";

  const ceoOutput = await runCEOAgent({
    date,
    orgName,
    priorActivity: ceoMemory
      ? `${priorActivity}\n\n[Memory] ${ceoMemory}`
      : priorActivity,
  });

  console.log("[Runway] CEO Agent complete. Priorities:", ceoOutput.priorities);

  if (memoryOnline) {
    await agentRemember({
      wing,
      room: "ceoAgent",
      hall: "events",
      content: `${date}: Priorities — ${ceoOutput.priorities.join("; ")}. ${ceoOutput.summary}`,
    });
  }

  // ── Step 2: Secondary agents with memory — parallel for cloud, sequential for Ollama ──
  let marketingOutput, devOutput, inboxOutput;

  if (getProvider() === "ollama") {
    console.log("[Runway] Ollama mode — running agents sequentially");
    const [mMem, iMem] = memoryOnline
      ? await Promise.all([agentWakeUp(wing, "marketingAgent"), agentWakeUp(wing, "inboxAgent")])
      : ["", ""];

    marketingOutput = await runMarketingAgent(
      `${ceoOutput.delegations["marketingAgent"] || "Create weekly content"}${mMem ? `\n\n[Memory] ${mMem}` : ""}`
    );
    devOutput = await runDevAgent(ceoOutput.delegations["devAgent"] || "Review platform health");
    inboxOutput = await runInboxAgent(
      `${ceoOutput.delegations["inboxAgent"] || "Draft pending replies"}${iMem ? `\n\n[Memory] ${iMem}` : ""}`
    );
  } else {
    const [mMem, iMem] = memoryOnline
      ? await Promise.all([agentWakeUp(wing, "marketingAgent"), agentWakeUp(wing, "inboxAgent")])
      : ["", ""];

    [marketingOutput, devOutput, inboxOutput] = await Promise.all([
      runMarketingAgent(`${ceoOutput.delegations["marketingAgent"] || "Create weekly content"}${mMem ? `\n\n[Memory] ${mMem}` : ""}`),
      runDevAgent(ceoOutput.delegations["devAgent"] || "Review platform health"),
      runInboxAgent(`${ceoOutput.delegations["inboxAgent"] || "Draft pending replies"}${iMem ? `\n\n[Memory] ${iMem}` : ""}`),
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

// ── Off-Hours Loop (5:00 PM – 9:00 AM) ──────────────────────────
// Agents scan Upwork, execute jobs, and update the hardware fund.
export async function runOffHoursLoop(): Promise<void> {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  console.log(`[Runway] Off-hours loop started — ${date}`);

  // Step 1: Scout new Upwork jobs
  const scoutOutput = await runUpworkScoutAgent();
  console.log(`[Runway] Upwork Scout complete — ${scoutOutput.jobs.length} jobs found`);

  // Step 2: Execute top-scoring pending jobs
  const execResults = await runJobExecutorAgent();
  const earned = execResults
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + r.estimatedEarnings, 0);
  console.log(`[Runway] Job Executor complete — $${earned.toFixed(2)} earned`);

  // Step 3: Update hardware fund status
  const fundStatus = await runHardwareFundAgent();
  console.log(`[Runway] Hardware Fund: $${fundStatus.totalEarned.toFixed(2)} total — ${fundStatus.progressToNextTier}% to next tier`);

  console.log("[Runway] Off-hours loop complete.");
}

// ── Cool-down / Debrief ──────────────────────────────────────────
// Runs at end of business day — summarizes the day and logs a debrief.
export async function runCoolDown(): Promise<void> {
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  console.log(`[Runway] Cool-down started — ${date}`);

  const todayActivity = await prisma.activityLog.findMany({
    where: { time: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    orderBy: { time: "desc" },
    take: 20,
  });

  const summary = todayActivity.map(a => a.label).join("; ") || "Quiet day — no activity logged.";

  await prisma.activityLog.create({
    data: {
      agentId: "system",
      label: `📋 End-of-day debrief (${date}): ${summary.slice(0, 200)}`,
    },
  });

  console.log("[Runway] Cool-down complete. Agents standing by for off-hours.");
}

// ── Schedule loader ──────────────────────────────────────────────
async function loadSchedule(): Promise<ScheduleConfig> {
  try {
    // Use the first user's schedule config (single-tenant for now)
    const settings = await prisma.userSettings.findFirst({
      where: { scheduleConfig: { not: null } },
    });
    if (settings?.scheduleConfig) {
      return { ...DEFAULT_SCHEDULE, ...JSON.parse(settings.scheduleConfig) };
    }
  } catch { /* fall through */ }
  return DEFAULT_SCHEDULE;
}

let scheduled = false;
let activeCrons: ReturnType<typeof cron.schedule>[] = [];

export async function initScheduler(): Promise<void> {
  if (scheduled) return;
  scheduled = true;

  // Load schedule config (or use defaults)
  const cfg = await loadSchedule();
  const crons = toCronExpressions(cfg);

  console.log(`[Runway] Schedule loaded:`);
  console.log(`  Business loop: ${crons.business}`);
  console.log(`  Cool-down:     ${crons.coolDown}`);
  console.log(`  Off-hours:     ${crons.offHours}`);

  // Business hours loop — default 4:30 AM Mon–Fri
  activeCrons.push(cron.schedule(crons.business, cronJob("business-loop", () => runNightlyLoop())));

  // Cool-down — default 5:30 PM Mon–Fri
  activeCrons.push(cron.schedule(crons.coolDown, cronJob("cool-down", () => runCoolDown())));

  // Off-hours loop — default 6:00 PM daily (incl. weekends if configured)
  activeCrons.push(cron.schedule(crons.offHours, cronJob("off-hours-loop", () => runOffHoursLoop())));

  // Monthly board report — 1st of each month at 7:00 AM
  activeCrons.push(cron.schedule("0 7 1 * *", cronJob("monthly-board-report", () => runMonthlyBoardReport())));

  console.log("[Runway] Scheduler registered — use Settings → Schedule to customize.");
}

// ── Monthly Board Report ─────────────────────────────────────────
// 1st of every month at 7:00 AM — fetches live data and emails a
// link to the board report page (user downloads PDF from there).
export async function runMonthlyBoardReport(): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.USER_EMAIL) {
    console.log("[Runway] Monthly board report skipped — RESEND_API_KEY or USER_EMAIL not set.");
    return;
  }

  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("No user found — cannot generate board report.");

  const data    = await getBoardReportData(user.id);
  const orgName = data.org?.name ?? "Runway";
  const month   = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const url     = `${baseUrl}/board-report`;

  const net      = data.financial.netPosition;
  const netColor = net >= 0 ? "#34C759" : "#FF3B30";
  const netStr   = `${net >= 0 ? "+" : ""}$${Math.abs(net).toLocaleString()}`;

  const alertLines = [
    data.compliance.overdueReminders > 0
      ? `⚠ ${data.compliance.overdueReminders} compliance deadline${data.compliance.overdueReminders > 1 ? "s" : ""} overdue`
      : null,
    ...data.domains.expiringSoon.map(d => `⚠ ${d.name} expires in ${d.days} days`),
  ].filter(Boolean);

  await getResend().emails.send({
    from: "Runway <onboarding@resend.dev>",
    to:   process.env.USER_EMAIL,
    subject: `${orgName} Board Report — ${month}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif">
        <div style="max-width:560px;margin:32px auto">

          <!-- Header -->
          <div style="background:#1D1D1F;border-radius:16px 16px 0 0;padding:28px 32px">
            <p style="margin:0;font-size:11px;font-weight:700;color:#8E8E93;letter-spacing:1.5px;text-transform:uppercase">${orgName}</p>
            <h1 style="margin:6px 0 2px;font-size:22px;font-weight:700;color:#fff">Monthly Board Report</h1>
            <p style="margin:0;font-size:13px;color:#8E8E93">${month} · auto-generated by Runway</p>
          </div>

          <!-- Stats -->
          <div style="background:#fff;padding:24px 32px;display:flex;gap:0">
            <div style="flex:1;padding-right:20px;border-right:1px solid #F0F0F0">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.8px">Net Position</p>
              <p style="margin:0;font-size:24px;font-weight:800;color:${netColor}">${netStr}</p>
            </div>
            <div style="flex:1;padding:0 20px;border-right:1px solid #F0F0F0">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.8px">Reserve Fund</p>
              <p style="margin:0;font-size:24px;font-weight:800;color:#FF9500">$${data.financial.reserveBalance.toLocaleString()}</p>
            </div>
            <div style="flex:1;padding-left:20px">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.8px">Grants</p>
              <p style="margin:0;font-size:24px;font-weight:800;color:#34C759">${data.grants.total} apps</p>
            </div>
          </div>

          ${alertLines.length > 0 ? `
          <!-- Alerts -->
          <div style="background:#FFF2F2;border-left:4px solid #FF3B30;padding:14px 24px">
            ${alertLines.map(l => `<p style="margin:2px 0;font-size:13px;color:#C0392B">${l}</p>`).join("")}
          </div>` : ""}

          <!-- CTA -->
          <div style="background:#fff;padding:28px 32px;border-radius:0 0 16px 16px;text-align:center">
            <a href="${url}" style="display:inline-block;background:#1D1D1F;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:12px">
              View Full Report →
            </a>
            <p style="margin:16px 0 0;font-size:12px;color:#8E8E93">
              Opens the live board report with current data. Use the Download PDF button on that page to save a snapshot.
            </p>
          </div>

        </div>
      </body>
      </html>`,
  });
}

/** Reload schedule from DB and restart crons (called when user saves schedule settings) */
export async function reloadScheduler(): Promise<void> {
  activeCrons.forEach(c => c.stop());
  activeCrons = [];
  scheduled = false;
  await initScheduler();
  console.log("[Runway] Scheduler reloaded with new config.");
}
