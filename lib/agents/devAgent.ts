import { callLLM, parseJSON } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export interface DevTask {
  task: string;
  file: string;
  priority: "high" | "medium" | "low";
  estimatedMinutes: number;
}

export async function runDevAgent(delegatedTask: string): Promise<DevTask[]> {
  const systemPrompt = `You are a senior full-stack developer. Review the delegated task and produce a prioritized list of code improvements or bug fixes for the Runway platform (a Next.js AI agent platform). For each item, include: task, file, priority (high/medium/low), and estimatedMinutes. Return as JSON array.`;

  const userMessage = `Delegated task: ${delegatedTask}

Review the Runway platform and identify the top 5 code improvements or fixes needed. Focus on performance, reliability, and user experience.`;

  let output: DevTask[];
  let rawText = "";
  let status = "success";

  try {
    rawText = await callLLM(systemPrompt, userMessage);
    output = parseJSON<DevTask[]>(rawText);
  } catch (err) {
    status = "error";
    output = [
      {
        task: "Add error boundaries to agent run components",
        file: "app/agents/page.tsx",
        priority: "high",
        estimatedMinutes: 30,
      },
    ];
    rawText = String(err);
  }

  await prisma.agentRun.create({
    data: {
      agentId: "devAgent",
      agentName: "Dev Agent",
      status,
      output: rawText,
    },
  });

  await prisma.activityLog.create({
    data: {
      agentId: "devAgent",
      label: `Dev Agent identified ${output.length} tasks`,
    },
  });

  return output;
}
