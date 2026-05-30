export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const [businessInfo, reminders, emailAccounts, connectedServices] = await Promise.all([
    prisma.businessInfo.findUnique({ where: { userId } }),
    prisma.businessReminder.findMany({ where: { userId, isActive: true }, orderBy: { dueDate: "asc" } }),
    prisma.emailAccount.findMany({ where: { userId }, select: { id: true, label: true, provider: true, username: true, isActive: true, lastSynced: true } }),
    prisma.connectedService.findMany({ where: { userId }, select: { id: true, service: true, label: true, isActive: true, createdAt: true } }),
  ]);

  return NextResponse.json({ businessInfo, reminders, emailAccounts, connectedServices });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  if (body.type === "business_info") {
    const info = await prisma.businessInfo.upsert({
      where: { userId },
      update: { ...body.data, updatedAt: new Date() },
      create: { userId, ...body.data },
    });
    return NextResponse.json({ ok: true, data: info });
  }

  if (body.type === "reminder") {
    const reminder = await prisma.businessReminder.create({
      data: { userId, ...body.data },
    });
    return NextResponse.json({ ok: true, data: reminder });
  }

  if (body.type === "delete_reminder") {
    await prisma.businessReminder.update({ where: { id: body.id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  }

  if (body.type === "paid_reminder") {
    await prisma.businessReminder.update({ where: { id: body.id }, data: { lastPaidDate: new Date() } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
