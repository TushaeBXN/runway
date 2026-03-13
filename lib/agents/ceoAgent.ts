import { callLLM, parseJSON } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export interface CEOContext {
  date: string;
  orgName: string;
  priorActivity: string;
}

export interface CEOOutput {
  priorities: string[];
  delegations: Record<string, string>;
  summary: string;
}

export async function runCEOAgent(context: CEOContext): Promise<CEOOutput> {
  const systemPrompt = `You are the CEO of a small nonprofit organization in Winston-Salem, NC focused on Technology and Education. Every night you evaluate the current state of the organization, decide the top 3 priorities for the next 24 hours, and delegate tasks to other agents. Return your output as JSON with keys: priorities (array of 3 strings), delegations (object mapping agent names to tasks), summary (2-sentence overview).`;

  const userMessage = `Date: ${context.date}
Organization: ${context.orgName}
Prior Activity: ${context.priorActivity}

Evaluate the organization's current state and provide tonight's priorities and delegations. Delegate tasks to: marketingAgent, devAgent, inboxAgent.`;

  let output: CEOOutput;
  let rawText = "";
  let status = "success";

  try {
    rawText = await callLLM(systemPrompt, userMessage);
    output = parseJSON<CEOOutput>(rawText);
  } catch (err) {
    status = "error";
    output = {
      priorities: ["Review operations", "Check financials", "Plan outreach"],
      delegations: {
        marketingAgent: "Draft weekly social content",
        devAgent: "Review platform performance",
        inboxAgent: "Respond to pending emails",
      },
      summary: "CEO agent encountered an error. Fallback priorities applied.",
    };
    rawText = String(err);
  }

  await prisma.agentRun.create({
    data: {
      agentId: "ceoAgent",
      agentName: "CEO Agent",
      status,
      output: rawText,
    },
  });

  await prisma.activityLog.create({
    data: {
      agentId: "ceoAgent",
      label: `CEO set ${output.priorities.length} priorities for ${context.date}`,
    },
  });

  return output;
}
