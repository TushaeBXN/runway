export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { label, provider, host, port, username, appPassword } = await req.json();

  const account = await prisma.emailAccount.create({
    data: {
      userId,
      label,
      provider,
      host,
      port: port || 993,
      username,
      appPassword: encrypt(appPassword), // encrypted at rest
    },
  });

  await prisma.auditLog.create({
    data: { userId, action: "EMAIL_ACCOUNT_ADDED", resource: account.id, detail: `${provider} account: ${username}` },
  });

  return NextResponse.json({ ok: true, id: account.id });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await req.json();

  // Verify ownership before deleting
  const acct = await prisma.emailAccount.findFirst({ where: { id, userId } });
  if (!acct) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.emailAccount.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { userId, action: "EMAIL_ACCOUNT_REMOVED", resource: id, detail: acct.username },
  });

  return NextResponse.json({ ok: true });
}
