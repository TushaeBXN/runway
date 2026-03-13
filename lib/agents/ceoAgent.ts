import { callLLM, parseJSON } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export interface CEOContext {
  date: string;
  orgName: string;
  priorActivity: string;
  userId?: string;
}

export interface CEOOutput {
  priorities: string[];
  delegations: Record<string, string>;
  summary: string;
}

export async function runCEOAgent(context: CEOContext): Promise<CEOOutput> {
  // If userId provided, check in-progress tasks and build context from them
  let taskContext = "";
  if (context.userId) {
    try {
      const inProgressTasks = await prisma.task.findMany({
        where: { userId: context.userId, status: "in_progress" },
        take: 10,
        orderBy: { createdAt: "desc" },
      });

      if (inProgressTasks.length > 0) {
        taskContext = `\n\nIn-Progress Tasks:\n${inProgressTasks
          .map((t) => `- [${t.id.slice(-6)}] ${t.title}: ${t.description}`)
          .join("\n")}`;
      }
    } catch (err) {
      console.error("[CEOAgent] Failed to fetch tasks:", err);
    }
  }

  const systemPrompt = `You are the CEO of a small nonprofit organization in Winston-Salem, NC focused on Technology and Education. Every night you evaluate the current state of the organization, decide the top 3 priorities for the next 24 hours, and delegate tasks to other agents. Return your output as JSON with keys: priorities (array of 3 strings), delegations (object mapping agent names to tasks), summary (2-sentence overview).`;

  const userMessage = `Date: ${context.date}
Organization: ${context.orgName}
Prior Activity: ${context.priorActivity}${taskContext}

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

  // If userId provided, create new tasks from CEO priorities
  if (context.userId && output.priorities.length > 0) {
    try {
      for (const priority of output.priorities) {
        await prisma.task.create({
          data: {
            userId: context.userId,
            title: priority,
            description: `CEO priority for ${context.date}`,
            category: "Operations",
            scheduledFor: "Tonight",
            agentId: "ceoAgent",
            status: "todo",
          },
        });
      }
    } catch (err) {
      console.error("[CEOAgent] Failed to create tasks:", err);
    }
  }

  return output;
}
