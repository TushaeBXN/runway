export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const { org, financial, grants, contacts, operations, compliance, domains, reportPeriod } = data;

  const orgName = org?.name ?? "Our Organization";
  const month = new Date().toLocaleString("en-US", { month: "long" });

  const sections = [
    // Executive summary
    {
      heading: "Executive Summary",
      body: [
        `${orgName} reports a net financial position of ${fmt(financial.netPosition)} for ${reportPeriod}.`,
        `Total income: ${fmt(financial.totalIncome)} | Total expenses: ${fmt(financial.totalExpenses)}.`,
        `The reserve fund holds ${fmt(financial.reserveBalance)}${financial.reserveTarget ? ` of a ${fmt(financial.reserveTarget)} target` : ""}.`,
        grants.byStatus?.awarded ? `${grants.byStatus.awarded} grant${grants.byStatus.awarded > 1 ? "s" : ""} awarded this period totaling ${fmt(financial.grantAwarded)}.` : "",
        compliance.overdueReminders > 0 ? `⚠ ${compliance.overdueReminders} compliance deadline${compliance.overdueReminders > 1 ? "s" : ""} overdue — requires immediate attention.` : "All compliance deadlines are current.",
      ].filter(Boolean).join(" "),
    },

    // Financial overview
    {
      heading: "Financial Overview",
      table: [
        { label: "Total Income",           value: fmt(financial.totalIncome) },
        { label: "  Gumroad Revenue",      value: fmt(financial.gumroadRevenue) },
        { label: "  Grant Awards",         value: fmt(financial.grantAwarded) },
        { label: "  Donations Received",   value: fmt(financial.donationTotal) },
        { label: "Total Expenses",         value: fmt(financial.totalExpenses) },
        { label: "  Contractor Payments",  value: fmt(financial.contractorSpend) },
        { label: "  Staff Payroll",        value: fmt(financial.payrollTotal) },
        { label: "Net Position",           value: `${financial.netPosition >= 0 ? "+" : ""}${fmt(financial.netPosition)}` },
        { label: "Reserve Fund Balance",   value: fmt(financial.reserveBalance) },
      ],
    },

    // Grants pipeline
    {
      heading: "Grants Pipeline",
      table: [
        { label: "Total Applications", value: String(grants.total) },
        ...Object.entries(grants.byStatus as Record<string, number>).map(([status, count]) => ({
          label: `  ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          value: String(count),
        })),
        { label: "Total Awarded", value: fmt(grants.awardedAmount) },
      ],
    },

    // Donor & contacts
    {
      heading: "Donors & Contacts",
      table: [
        { label: "Total Contacts", value: String(contacts.total) },
        ...Object.entries(contacts.byType as Record<string, number>).map(([type, count]) => ({
          label: `  ${type.charAt(0).toUpperCase() + type.slice(1)}s`,
          value: String(count),
        })),
        { label: "Total Donated (all-time)", value: fmt(contacts.totalDonated) },
      ],
    },

    // Operations
    {
      heading: "Operations",
      table: [
        { label: "Total Hours Logged",    value: `${operations.totalHours.toFixed(1)}h` },
        { label: "  Staff Hours",         value: `${operations.staffHours.toFixed(1)}h` },
        { label: "  Volunteer Hours",     value: `${operations.volunteerHours.toFixed(1)}h` },
        { label: "Payroll Estimate",      value: fmt(operations.payrollTotal) },
        { label: "Contractor Payments",   value: fmt(operations.contractorSpend) },
      ],
    },

    // Compliance
    {
      heading: "Compliance Status",
      body: compliance.overdueReminders > 0
        ? `${compliance.overdueReminders} deadline(s) overdue.`
        : "All filing deadlines are current.",
      ...(compliance.upcomingDeadlines?.length > 0 ? {
        list: compliance.upcomingDeadlines.map((r: { label: string; dueDate: string }) =>
          `${r.label} — due ${r.dueDate}`
        ),
      } : {}),
    },

    // Domains
    ...(domains.expiringSoon?.length > 0 ? [{
      heading: "Domain Renewals Required",
      list: domains.expiringSoon.map((d: { name: string; days: number }) =>
        `${d.name} — expires in ${d.days} day${d.days !== 1 ? "s" : ""}`
      ),
    }] : []),
  ];

  // POST to the PDF renderer
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const pdfRes = await fetch(`${baseUrl}/api/export/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `${orgName} — Board Report ${month} ${reportPeriod}`,
      meta: {
        "Report Period": reportPeriod,
        "Generated":     new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        "Mission":       org?.mission?.slice(0, 120) ?? "",
      },
      sections,
    }),
  });

  if (!pdfRes.ok) return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });

  const pdfBuffer = await pdfRes.arrayBuffer();
  const slug = `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-board-report-${reportPeriod}`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
      "Content-Length": String(pdfBuffer.byteLength),
    },
  });
}
