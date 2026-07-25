export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const THRESHOLD = 600; // IRS 1099-NEC reporting threshold
const TAX_YEAR = new Date().getFullYear();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const contractors = await prisma.contractor.findMany({
    where: { userId, isActive: true, taxYear: TAX_YEAR },
    include: { payments: { orderBy: { paidOn: "desc" } } },
    orderBy: { totalPaid: "desc" },
  });

  return NextResponse.json(contractors);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();

  if (body.action === "add_contractor") {
    const c = await prisma.contractor.create({
      data: {
        userId,
        name: body.name,
        email: body.email ?? null,
        ein: body.ein ?? null,
        address: body.address ?? null,
        businessName: body.businessName ?? null,
        taxYear: TAX_YEAR,
        totalPaid: 0,
        notes: body.notes ?? null,
      },
      include: { payments: true },
    });
    return NextResponse.json({ ok: true, contractor: c });
  }

  if (body.action === "mark_1099_sent") {
    const c = await prisma.contractor.update({
      where: { id: body.contractorId },
      data: { form1099Sent: true, sentAt: new Date() },
    });
    return NextResponse.json({ ok: true, contractor: c });
  }

  if (body.action === "delete_contractor") {
    await prisma.contractor.update({ where: { id: body.contractorId }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// Helper: recalculate totalPaid + needs1099 flag after any payment change
export async function recalcContractor(contractorId: string) {
  const payments = await prisma.contractorPayment.findMany({ where: { contractorId } });
  const total = payments.reduce((s, p) => s + p.amount, 0);
  await prisma.contractor.update({
    where: { id: contractorId },
    data: { totalPaid: total, needs1099: total >= THRESHOLD },
  });
}
