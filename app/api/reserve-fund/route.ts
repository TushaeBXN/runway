export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const [fund, transactions, sales] = await Promise.all([
    prisma.reserveFund.upsert({
      where: { userId },
      update: {},
      create: { userId, label: "Compliance Reserve", balance: 0, targetAmount: 0, autoAllocatePct: 20 },
    }),
    prisma.reserveFundTransaction.findMany({
      where: { userId }, orderBy: { createdAt: "desc" }, take: 50,
    }),
    prisma.gumroadSale.findMany({
      where: { userId }, orderBy: { createdAt: "desc" }, take: 20,
    }),
  ]);

  const gumroadTotal = sales.reduce((s, sale) => s + sale.net, 0);

  return NextResponse.json({ fund, transactions, sales, gumroadTotal });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  if (body.action === "update_settings") {
    const fund = await prisma.reserveFund.upsert({
      where: { userId },
      update: { label: body.label, targetAmount: body.targetAmount ?? 0, autoAllocatePct: body.autoAllocatePct ?? 20 },
      create: { userId, label: body.label ?? "Compliance Reserve", balance: 0, targetAmount: body.targetAmount ?? 0, autoAllocatePct: body.autoAllocatePct ?? 20 },
    });
    return NextResponse.json({ ok: true, fund });
  }

  if (body.action === "manual_deposit") {
    const amount = parseFloat(body.amount);
    if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    await Promise.all([
      prisma.reserveFund.upsert({ where: { userId }, update: { balance: { increment: amount } }, create: { userId, balance: amount, targetAmount: 0, autoAllocatePct: 20 } }),
      prisma.reserveFundTransaction.create({ data: { userId, amount, type: "deposit", source: "manual", description: body.description ?? "Manual deposit" } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "withdrawal") {
    const amount = parseFloat(body.amount);
    if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    const fund = await prisma.reserveFund.findUnique({ where: { userId } });
    if (!fund || fund.balance < amount) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    await Promise.all([
      prisma.reserveFund.update({ where: { userId }, data: { balance: { decrement: amount } } }),
      prisma.reserveFundTransaction.create({ data: { userId, amount, type: "withdrawal", source: "manual", description: body.description ?? "Withdrawal" } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "connect_gumroad") {
    // Store Gumroad seller ID in ConnectedService
    await prisma.connectedService.upsert({
      where: { userId_service: { userId, service: "gumroad" } } as never,
      update: { credentials: JSON.stringify({ sellerId: body.sellerId }), isActive: true, label: "Gumroad" },
      create: { userId, service: "gumroad", label: "Gumroad", credentials: JSON.stringify({ sellerId: body.sellerId }), isActive: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
