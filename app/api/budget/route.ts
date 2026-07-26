export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseDollar(s: string): number {
  return parseFloat(s.replace(/[$,\s]/g, "")) || 0;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const year = new Date().getFullYear();

  // ── Actuals (aggregated from existing data) ─────────────────────────────
  const [
    gumroadAgg,
    contractorAgg,
    timeEntries,
    grantApps,
    contacts,
    reserveFund,
    reserveWithdrawals,
    budget,
  ] = await Promise.all([
    // Gumroad revenue
    prisma.gumroadSale.aggregate({ where: { userId }, _sum: { net: true } }),

    // Contractor payments (this year)
    prisma.contractorPayment.aggregate({
      where: { userId, paidOn: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } },
      _sum: { amount: true },
    }),

    // Time entries (paid staff only, approved)
    prisma.timeEntry.findMany({
      where: { userId, isVolunteer: false, approved: true, date: { gte: new Date(`${year}-01-01`) } },
      select: { hours: true, hourlyRate: true },
    }),

    // Awarded grants
    prisma.grantApplication.findMany({ where: { userId, status: "awarded" }, select: { amount: true } }),

    // Contact interactions (donations)
    prisma.contactInteraction.findMany({
      where: { contact: { userId }, type: "donation" },
      select: { amount: true },
    }),

    // Reserve fund
    prisma.reserveFund.findUnique({ where: { userId } }),

    // Reserve withdrawals
    prisma.reserveFundTransaction.aggregate({
      where: { userId, type: "withdrawal" },
      _sum: { amount: true },
    }),

    // Budget plan
    prisma.budget.findFirst({
      where: { userId, fiscalYear: year },
      include: { lineItems: { orderBy: [{ type: "asc" }, { category: "asc" }] } },
    }),
  ]);

  const gumroadRevenue   = gumroadAgg._sum.net ?? 0;
  const contractorTotal  = contractorAgg._sum.amount ?? 0;
  const payrollTotal     = timeEntries.reduce((s, e) => s + e.hours * (e.hourlyRate ?? 0), 0);
  const grantTotal       = grantApps.reduce((s, g) => s + parseDollar(g.amount), 0);
  const donationTotal    = contacts.reduce((s, c) => s + (c.amount ?? 0), 0);
  const reserveBalance   = reserveFund?.balance ?? 0;
  const withdrawalTotal  = reserveWithdrawals._sum.amount ?? 0;

  const actuals = {
    income: {
      "Gumroad Revenue":  gumroadRevenue,
      "Grant Awards":     grantTotal,
      "Donations":        donationTotal,
    },
    expense: {
      "Contractor Payments": contractorTotal,
      "Staff Payroll":       payrollTotal,
      "Reserve Withdrawals": withdrawalTotal,
    },
  };

  const totalIncome  = Object.values(actuals.income).reduce((s, v) => s + v, 0);
  const totalExpense = Object.values(actuals.expense).reduce((s, v) => s + v, 0);
  const net = totalIncome - totalExpense;

  return NextResponse.json({ budget, actuals, totalIncome, totalExpense, net, reserveBalance, year });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const year = new Date().getFullYear();

  if (body.action === "upsert_line") {
    // Get or create budget for this fiscal year
    let budget = await prisma.budget.findFirst({ where: { userId, fiscalYear: year } });
    if (!budget) {
      budget = await prisma.budget.create({ data: { userId, name: `${year} Operating Budget`, fiscalYear: year } });
    }

    const { category, type, label, planned, id } = body;
    if (id) {
      await prisma.budgetLineItem.update({ where: { id }, data: { category, type, label, planned: Number(planned) } });
    } else {
      await prisma.budgetLineItem.create({ data: { budgetId: budget.id, category, type, label, planned: Number(planned) } });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_line") {
    await prisma.budgetLineItem.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
