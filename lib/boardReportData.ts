import { prisma } from "@/lib/prisma";

function parseDollar(s: string): number {
  return parseFloat(s.replace(/[$,\s]/g, "")) || 0;
}

function daysUntil(date: Date): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const t = new Date(date); t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - now.getTime()) / 86400000);
}

export async function getBoardReportData(userId: string) {
  const year = new Date().getFullYear();
  const now = new Date();

  const [
    orgProfile,
    grantApps,
    contacts,
    timeEntries,
    contractorAgg,
    gumroadAgg,
    reserveFund,
    reminders,
    domains,
    pendingApprovals,
    inboxPending,
  ] = await Promise.all([
    prisma.orgProfile.findUnique({ where: { userId } }),
    prisma.grantApplication.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.contact.findMany({ where: { userId }, select: { type: true, totalDonated: true } }),
    prisma.timeEntry.findMany({
      where: { userId, date: { gte: new Date(`${year}-01-01`) } },
      select: { hours: true, hourlyRate: true, isVolunteer: true, approved: true },
    }),
    prisma.contractorPayment.aggregate({
      where: { userId, paidOn: { gte: new Date(`${year}-01-01`) } },
      _sum: { amount: true },
    }),
    prisma.gumroadSale.aggregate({ where: { userId }, _sum: { net: true } }),
    prisma.reserveFund.findUnique({ where: { userId } }),
    prisma.businessReminder.findMany({ where: { userId, isActive: true }, orderBy: { dueDate: "asc" } }),
    prisma.domain.findMany({ where: { userId }, orderBy: { expiresAt: "asc" } }),
    prisma.pendingApproval.count({ where: { status: "pending" } }),
    prisma.ingestedEmail.count({ where: { userId, status: "pending" } }),
  ]);

  const gumroadRevenue  = gumroadAgg._sum.net ?? 0;
  const contractorSpend = contractorAgg._sum.amount ?? 0;
  const grantAwarded    = grantApps.filter(g => g.status === "awarded").reduce((s, g) => s + parseDollar(g.amount), 0);
  const donationTotal   = contacts.reduce((s, c) => s + c.totalDonated, 0);
  const totalIncome     = gumroadRevenue + grantAwarded + donationTotal;
  const payrollTotal    = timeEntries.filter(e => !e.isVolunteer && e.approved).reduce((s, e) => s + e.hours * (e.hourlyRate ?? 0), 0);
  const totalExpenses   = contractorSpend + payrollTotal;
  const netPosition     = totalIncome - totalExpenses;

  const grantsByStatus = grantApps.reduce((acc, g) => {
    acc[g.status] = (acc[g.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const contactsByType = contacts.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalHours     = timeEntries.reduce((s, e) => s + e.hours, 0);
  const volunteerHours = timeEntries.filter(e => e.isVolunteer).reduce((s, e) => s + e.hours, 0);
  const staffHours     = totalHours - volunteerHours;

  const upcomingDeadlines = reminders.filter(r => {
    const [mm, dd] = r.dueDate.split("-");
    const d = daysUntil(new Date(year, parseInt(mm) - 1, parseInt(dd)));
    return d >= 0 && d <= 90;
  }).slice(0, 5).map(r => {
    const [mm, dd] = r.dueDate.split("-");
    return { label: r.label, dueDate: new Date(year, parseInt(mm) - 1, parseInt(dd)).toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
  });

  const overdueReminders = reminders.filter(r => {
    const [mm, dd] = r.dueDate.split("-");
    return daysUntil(new Date(year, parseInt(mm) - 1, parseInt(dd))) < 0;
  }).length;

  const expiringDomains = domains
    .filter(d => { const days = daysUntil(d.expiresAt); return days >= 0 && days <= 60; })
    .map(d => ({ name: d.name, days: daysUntil(d.expiresAt) }));

  return {
    generatedAt:  now.toISOString(),
    reportPeriod: String(year),
    org: orgProfile ? { name: orgProfile.orgName, mission: orgProfile.mission, focusAreas: orgProfile.focusAreas } : null,
    financial: {
      totalIncome, totalExpenses, netPosition,
      gumroadRevenue, grantAwarded, donationTotal,
      contractorSpend, payrollTotal,
      reserveBalance: reserveFund?.balance ?? 0,
      reserveTarget:  reserveFund?.targetAmount ?? 0,
    },
    grants:     { total: grantApps.length, byStatus: grantsByStatus, awardedAmount: grantAwarded },
    contacts:   { total: contacts.length,  byType: contactsByType,   totalDonated: donationTotal },
    operations: { totalHours, staffHours, volunteerHours, payrollTotal, contractorSpend },
    compliance: { upcomingDeadlines, overdueReminders, totalReminders: reminders.length },
    domains:    { total: domains.length, expiringSoon: expiringDomains },
    pendingApprovals,
    inboxPending,
  };
}

export type BoardReportData = Awaited<ReturnType<typeof getBoardReportData>>;
