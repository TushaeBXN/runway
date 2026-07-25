// POST /api/email/send — send an approved email draft via SMTP
// Called when user approves an email draft from the Inbox page.
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { decrypt } from "@/lib/crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { emailId, to, subject, body } = await req.json();
  if (!to || !subject || !body) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  // Find a connected email account to send from
  const acct = await prisma.emailAccount.findFirst({ where: { userId, isActive: true } });
  if (!acct) return NextResponse.json({ error: "No email account connected. Add one in Compliance → Email Accounts." }, { status: 400 });

  const result = await sendEmail({
    config: { host: acct.host, port: acct.port, username: acct.username, appPassword: decrypt(acct.appPassword) },
    to, subject, body,
  });

  if (result.ok && emailId) {
    await prisma.ingestedEmail.updateMany({ where: { id: emailId, userId }, data: { status: "replied" } });
  }

  return NextResponse.json(result);
}
