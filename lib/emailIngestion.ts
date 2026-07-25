// Email ingestion pipeline — fetches new emails, classifies them with AI,
// stores them in IngestedEmail, and routes to the appropriate agent channel.

import { prisma } from "@/lib/prisma";
import { fetchUnreadEmails, markAsRead, EmailAccountConfig } from "@/lib/email";
import { decrypt } from "@/lib/crypto";
import { callLLM, parseJSON } from "@/lib/llm";

export type EmailCategory = "grant" | "donor" | "support" | "vendor" | "compliance" | "other";
export type EmailPriority = "urgent" | "normal" | "low";

interface ClassifyResult {
  category: EmailCategory;
  priority: EmailPriority;
  summary: string;
  agentRoute: string; // which agent should handle it
  shouldReply: boolean;
}

const CATEGORY_AGENT: Record<EmailCategory, string> = {
  grant:      "grantArchitectAgent",
  donor:      "marketingAgent",
  support:    "inboxAgent",
  vendor:     "ceoAgent",
  compliance: "ceoAgent",
  other:      "inboxAgent",
};

const CATEGORY_CHANNEL_HINT: Record<EmailCategory, string> = {
  grant:      "grants",
  donor:      "marketing",
  support:    "general",
  vendor:     "general",
  compliance: "general",
  other:      "general",
};

async function classifyEmail(subject: string, from: string, body: string): Promise<ClassifyResult> {
  const system = `You are an email triage AI for a nonprofit organization. Classify the email and return JSON only.

Categories:
- grant: Foundation grants, RFPs, grant opportunities, award notifications
- donor: Individual donors, fundraising, donations, pledge fulfillments
- support: Customer/community support requests, questions, complaints
- vendor: Invoices, vendor proposals, service renewals, supplier emails
- compliance: Government notices, legal, IRS, state filings, regulatory
- other: Newsletters, spam, internal, misc

Priority:
- urgent: Deadline within 7 days, legal/compliance notice, payment overdue
- normal: Standard correspondence requiring a response within a week
- low: Newsletters, FYI only, no action required

Return JSON: { category, priority, summary (one sentence, action-oriented), agentRoute (one of: grantArchitectAgent, marketingAgent, inboxAgent, ceoAgent), shouldReply (boolean) }`;

  const user = `From: ${from}\nSubject: ${subject}\n\n${body.slice(0, 800)}`;

  try {
    const raw = await callLLM(system, user, 512, { json: true, taskComplexity: "simple" });
    return parseJSON<ClassifyResult>(raw);
  } catch {
    return { category: "other", priority: "normal", summary: subject, agentRoute: "inboxAgent", shouldReply: false };
  }
}

export interface IngestResult {
  accountId: string;
  accountLabel: string;
  fetched: number;
  stored: number;
  skipped: number;
  errors: string[];
}

export async function ingestEmailsForUser(userId: string): Promise<IngestResult[]> {
  const accounts = await prisma.emailAccount.findMany({ where: { userId, isActive: true } });
  const results: IngestResult[] = [];

  for (const acct of accounts) {
    const result: IngestResult = { accountId: acct.id, accountLabel: acct.label, fetched: 0, stored: 0, skipped: 0, errors: [] };

    try {
      const config: EmailAccountConfig = {
        host: acct.host,
        port: acct.port,
        username: acct.username,
        appPassword: decrypt(acct.appPassword),
      };

      const messages = await fetchUnreadEmails(config, 20);
      result.fetched = messages.length;

      const newUids: number[] = [];

      for (const msg of messages) {
        // Skip already-ingested
        const exists = await prisma.ingestedEmail.findUnique({ where: { accountId_uid: { accountId: acct.id, uid: msg.uid } } });
        if (exists) { result.skipped++; continue; }

        // Classify with AI
        const classification = await classifyEmail(msg.subject, msg.from, msg.body);

        // Store in DB
        await prisma.ingestedEmail.create({
          data: {
            userId,
            accountId: acct.id,
            uid: msg.uid,
            subject: msg.subject,
            fromEmail: msg.from,
            receivedAt: new Date(msg.date),
            body: msg.body.slice(0, 4000),
            category: classification.category,
            priority: classification.priority,
            summary: classification.summary,
            agentRoute: classification.agentRoute,
            status: "pending",
          },
        });

        newUids.push(msg.uid);
        result.stored++;

        // Post a channel message in the relevant channel if urgent or grant/donor
        if (classification.priority === "urgent" || ["grant", "donor", "compliance"].includes(classification.category)) {
          await postEmailToChannel(userId, msg, classification);
        }
      }

      // Mark fetched emails as read so we don't re-fetch them
      if (newUids.length > 0) await markAsRead(config, newUids);

      // Update last synced
      await prisma.emailAccount.update({ where: { id: acct.id }, data: { lastSynced: new Date() } });

    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : String(err));
    }

    results.push(result);
  }

  return results;
}

async function postEmailToChannel(
  userId: string,
  msg: { subject: string; from: string; body: string },
  classification: ClassifyResult
) {
  try {
    const hint = CATEGORY_CHANNEL_HINT[classification.category];
    const channel = await prisma.channel.findFirst({ where: { name: { contains: hint } } });
    if (!channel) return;

    const priorityTag = classification.priority === "urgent" ? "🚨 URGENT" : classification.category === "grant" ? "🏆 GRANT" : "📬";

    await prisma.channelMessage.create({
      data: {
        channelId: channel.id,
        senderId: "inboxAgent",
        senderType: "agent",
        senderName: "Inbox Agent",
        content: `${priorityTag} New email ingested\n\n**From:** ${msg.from}\n**Subject:** ${msg.subject}\n\n${classification.summary}\n\n_Routed to ${CATEGORY_AGENT[classification.category]}. Reply via the Inbox tab._`,
        msgType: "text",
      },
    });
  } catch { /* non-critical */ }
}

// Build per-email reply draft using the appropriate agent prompt
export async function draftReply(emailId: string, userId: string): Promise<{ ok: boolean; draftId?: string; error?: string }> {
  const email = await prisma.ingestedEmail.findUnique({ where: { id: emailId } });
  if (!email || email.userId !== userId) return { ok: false, error: "Not found" };

  const system = `You are a professional nonprofit communications agent. Draft a reply to this email. Return JSON with: { to, subject, body, replyToSubject }. Be warm, concise, and action-oriented.`;
  const user = `From: ${email.fromEmail}\nSubject: ${email.subject}\n\n${email.body}`;

  try {
    const raw = await callLLM(system, user, 1024, { taskComplexity: "medium" });
    const draft = parseJSON<{ to: string; subject: string; body: string; replyToSubject?: string }>(raw);

    const approval = await prisma.pendingApproval.create({
      data: {
        agentId: email.agentRoute ?? "inboxAgent",
        agentName: "Inbox Agent",
        actionType: "email",
        title: `Reply to: "${email.subject}"`,
        description: `To: ${email.fromEmail}`,
        payload: JSON.stringify({ ...draft, to: email.fromEmail }),
      },
    });

    await prisma.ingestedEmail.update({ where: { id: emailId }, data: { status: "in_review", draftId: approval.id } });

    return { ok: true, draftId: approval.id };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
