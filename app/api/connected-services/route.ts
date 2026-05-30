export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { service, label, credentials } = await req.json();

  const existing = await prisma.connectedService.findFirst({ where: { userId, service } });
  if (existing) {
    await prisma.connectedService.update({
      where: { id: existing.id },
      data: { label, credentials: JSON.stringify(credentials), isActive: true },
    });
  } else {
    await prisma.connectedService.create({
      data: { userId, service, label, credentials: JSON.stringify(credentials) },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { service } = await req.json();
  await prisma.connectedService.updateMany({ where: { userId, service }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
