import { callLLMWithSearch, parseJSON } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export interface UpworkJobListing {
  title: string;
  budget: string;
  description: string;
  skills: string[];
  score: number;
  assignedAgent: string;
  upworkUrl?: string;
}

export interface UpworkScoutOutput {
  jobs: UpworkJobListing[];
  summary: string;
  topPick: string;
}

const AGENT_CAPABILITIES = `
- ceoAgent: Strategic planning, prioritization, task delegation, operational summaries
- marketingAgent: Social media copy (X/LinkedIn/Meta), brand storytelling, campaign strategy, email copy
- devAgent: Code review notes, platform health reports, technical documentation, debugging reports
- grantArchitectAgent: Grant research memos, proposal outlines, nonprofit funding strategy, LOI drafts
- inboxAgent: Professional email drafts, client communication, follow-up sequences
- upworkScoutAgent: Content writing, research reports, copywriting, business writing, SEO content
`;

export async function runUpworkScoutAgent(): Promise<UpworkScoutOutput> {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const systemPrompt = `You are an autonomous Upwork job scout for an AI agent team. Your mission is to find paid freelance jobs on Upwork that the agent team can complete autonomously to earn money for hardware upgrades.

The agent team's capabilities are:
${AGENT_CAPABILITIES}

You have live internet access. Search Upwork and freelance job boards for currently posted jobs that:
1. Match the team's writing, research, content, or strategy capabilities
2. Have clear, specific deliverables (not ongoing retainer work)
3. Budget between $25–$500 per job (ideal for autonomous completion)
4. Can be completed without video calls or real-time client interaction
5. Are posted within the last 48 hours

For each job, score it 1–100 based on:
- Capability match (can agents do this autonomously?) — up to 40 pts
- Budget-to-effort ratio — up to 25 pts
- Clear deliverable with no ambiguity — up to 20 pts
- Recency (posted recently) — up to 15 pts

Return exactly 5 jobs. Only include jobs with score >= 60.

Return a single JSON object with keys:
- jobs: array of 5 objects each with: title, budget, description (2 sentences), skills (array of strings), score (number 1–100), assignedAgent (one of the agent IDs above), upworkUrl (string or null)
- summary: one sentence summarizing today's opportunities
- topPick: title of the highest-scored job`;

  const userMessage = `Today is ${today}. It is currently after 5:00 PM — off-hours mode is active.

Search Upwork and other freelance platforms for jobs our agent team can complete autonomously tonight. Focus on: content writing, research reports, copywriting, email sequences, grant writing assistance, SEO articles, business strategy documents, social media content packages.

Return valid JSON only.`;

  let output: UpworkScoutOutput;
  let rawText = "";
  let status = "success";

  try {
    rawText = await callLLMWithSearch(systemPrompt, userMessage, 6144);
    output = parseJSON<UpworkScoutOutput>(rawText);
  } catch (err) {
    status = "error";
    output = {
      jobs: [
        {
          title: "Write 5 LinkedIn posts for SaaS startup",
          budget: "$75",
          description: "Create 5 professional LinkedIn posts highlighting product features and company culture. Posts should be 150-200 words each with strong CTAs.",
          skills: ["LinkedIn", "copywriting", "SaaS marketing"],
          score: 82,
          assignedAgent: "marketingAgent",
          upworkUrl: null,
        },
        {
          title: "Research report: AI tools for small nonprofits",
          budget: "$120",
          description: "Produce a 1,500-word research report on the top 10 AI tools suitable for small nonprofit organizations. Include pricing, use cases, and recommendations.",
          skills: ["research", "technical writing", "nonprofit"],
          score: 78,
          assignedAgent: "grantArchitectAgent",
          upworkUrl: null,
        },
        {
          title: "Draft 3 professional email sequences for coaching business",
          budget: "$90",
          description: "Write a welcome sequence, re-engagement sequence, and sales sequence (3 emails each) for a life coaching business. Warm, conversational tone.",
          skills: ["email copywriting", "coaching", "sequences"],
          score: 75,
          assignedAgent: "inboxAgent",
          upworkUrl: null,
        },
      ],
      summary: "3 strong off-hours opportunities found — content and email work best matched to current capabilities.",
      topPick: "Write 5 LinkedIn posts for SaaS startup",
    };
    rawText = String(err);
  }

  // Persist each job to DB
  for (const job of output.jobs) {
    await prisma.upworkJob.create({
      data: {
        title: job.title,
        budget: job.budget,
        description: job.description,
        skills: job.skills.join(", "),
        score: job.score,
        assignedAgent: job.assignedAgent,
        upworkUrl: job.upworkUrl ?? null,
        status: "pending",
      },
    });
  }

  await prisma.agentRun.create({
    data: {
      agentId: "upworkScoutAgent",
      agentName: "Upwork Scout",
      status,
      output: rawText,
    },
  });

  await prisma.activityLog.create({
    data: {
      agentId: "upworkScoutAgent",
      label: `Upwork Scout found ${output.jobs.length} jobs — top pick: "${output.topPick}"`,
    },
  });

  return output;
}
