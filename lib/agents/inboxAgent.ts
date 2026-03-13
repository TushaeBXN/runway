import { callLLM, parseJSON } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

export interface InboxOutput {
  emails: EmailDraft[];
  flagged: string[];
}

export async function runInboxAgent(
  delegatedTask: string
): Promise<InboxOutput> {
  const systemPrompt = `You are an executive assistant managing email for a nonprofit director. Based on the delegated task context, draft 2 professional email replies (one to a partner organization, one to a donor). Return JSON with keys: emails (array of objects with to, subject, body), flagged (array of topics needing human review).`;

  const userMessage = `Delegated task: ${delegatedTask}

Draft professional email responses appropriate for a technology and education nonprofit in Winston-Salem, NC. Be warm, specific, and action-oriented.`;

  let output: InboxOutput;
  let rawText = "";
  let status = "success";

  try {
    rawText = await callLLM(systemPrompt, userMessage);
    output = parseJSON<InboxOutput>(rawText);
  } catch (err) {
    status = "error";
    output = {
      emails: [
        {
          to: "partner@organization.org",
          subject: "Re: Partnership Opportunity",
          body: "Thank you for reaching out. We would love to explore this partnership further.",
        },
      ],
      flagged: ["Budget approval needed for Q2 programs"],
    };
    rawText = String(err);
  }

  await prisma.agentRun.create({
    data: {
      agentId: "inboxAgent",
      agentName: "Inbox Agent",
      status,
      output: rawText,
    },
  });

  await prisma.activityLog.create({
    data: {
      agentId: "inboxAgent",
      label: `Inbox Agent drafted ${output.emails.length} emails, flagged ${output.flagged.length} items`,
    },
  });

  return output;
}
