export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { label, provider, host, port, username, appPassword } = await req.json();

  const account = await prisma.emailAccount.create({
    data: { userId, label, provider, host, port: port || 993, username, appPassword },
  });

  return NextResponse.json({ ok: true, id: account.id });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.emailAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
