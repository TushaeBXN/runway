import { callLLM, parseJSON } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { fetchUnreadEmails } from "@/lib/email";

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  replyToSubject?: string;
}

export interface InboxOutput {
  emails: EmailDraft[];
  flagged: string[];
}

export async function runInboxAgent(
  delegatedTask: string,
  userId?: string
): Promise<InboxOutput> {

  // Pull real unread emails if any accounts are connected
  let realEmailContext = "";
  if (userId) {
    try {
      const accounts = await prisma.emailAccount.findMany({
        where: { userId, isActive: true },
        take: 1,
      });
      if (accounts.length > 0) {
        const acct = accounts[0];
        const messages = await fetchUnreadEmails({
          host: acct.host,
          port: acct.port,
          username: acct.username,
          appPassword: acct.appPassword,
        }, 5);
        if (messages.length > 0) {
          realEmailContext = `\n\nUnread emails in inbox:\n${messages.map((m, i) =>
            `[${i + 1}] From: ${m.from}\nSubject: ${m.subject}\nDate: ${m.date}\n${m.body.slice(0, 500)}`
          ).join("\n\n---\n\n")}`;
          await prisma.emailAccount.update({
            where: { id: acct.id },
            data: { lastSynced: new Date() },
          });
        }
      }
    } catch (err) {
      console.warn("[InboxAgent] Email fetch failed:", err);
    }
  }

  const hasRealEmails = realEmailContext.length > 0;

  const systemPrompt = hasRealEmails
    ? `You are an executive assistant managing email for a nonprofit director. You have been given real unread emails from the inbox. Draft professional replies to each one. Return JSON with keys: emails (array of objects with to, subject, body, replyToSubject), flagged (array of topics needing human review before replying).`
    : `You are an executive assistant managing email for a nonprofit director. Based on the delegated task context, draft 2 professional email replies (one to a partner organization, one to a donor). Return JSON with keys: emails (array of objects with to, subject, body), flagged (array of topics needing human review).`;

  const userMessage = hasRealEmails
    ? `Draft professional replies to these unread emails for a technology and education nonprofit in Winston-Salem, NC. Be warm, specific, and action-oriented.${realEmailContext}`
    : `Delegated task: ${delegatedTask}\n\nDraft professional email responses appropriate for a technology and education nonprofit in Winston-Salem, NC. Be warm, specific, and action-oriented.`;

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
    data: { agentId: "inboxAgent", agentName: "Inbox Agent", status, output: rawText },
  });

  // Queue every email draft for approval — never auto-send
  for (const email of output.emails) {
    await prisma.pendingApproval.create({
      data: {
        agentId: "inboxAgent",
        agentName: "Inbox Agent",
        actionType: "email",
        title: `Review email draft: "${email.subject}"`,
        description: `To: ${email.to}${email.replyToSubject ? ` · Re: ${email.replyToSubject}` : ""}`,
        payload: JSON.stringify(email),
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      agentId: "inboxAgent",
      label: `Inbox drafted ${output.emails.length} email(s)${hasRealEmails ? " from real inbox" : ""} — waiting for your approval before sending`,
    },
  });

  return output;
}
