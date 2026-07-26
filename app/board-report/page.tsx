"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ReportData {
  generatedAt: string;
  reportPeriod: string;
  org: { name: string; mission: string; focusAreas: string } | null;
  financial: {
    totalIncome: number; totalExpenses: number; netPosition: number;
    gumroadRevenue: number; grantAwarded: number; donationTotal: number;
    contractorSpend: number; payrollTotal: number;
    reserveBalance: number; reserveTarget: number;
  };
  grants: { total: number; byStatus: Record<string, number>; awardedAmount: number };
  contacts: { total: number; byType: Record<string, number>; totalDonated: number };
  operations: { totalHours: number; staffHours: number; volunteerHours: number; payrollTotal: number; contractorSpend: number };
  compliance: { upcomingDeadlines: { label: string; dueDate: string }[]; overdueReminders: number; totalReminders: number };
  domains: { total: number; expiringSoon: { name: string; days: number }[] };
  pendingApprovals: number;
  inboxPending: number;
}

function fmt(n: number) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 16px" }}>{title}</h3>
      {children}
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F5F5F7" }}>
      <span style={{ fontSize: 13, color: "#3C3C43" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: color ?? "#1D1D1F" }}>{value}</span>
    </div>
  );
}

export default function BoardReportPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") load();
  }, [status]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/board-report");
    const d = await res.json();
    setData(d);
    setLoading(false);
  }

  async function downloadPDF() {
    if (!data) return;
    setDownloading(true);
    const res = await fetch("/api/board-report/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { alert("PDF generation failed — check server logs"); setDownloading(false); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const orgSlug = (data.org?.name ?? "org").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.href = url; a.download = `${orgSlug}-board-report-${data.reportPeriod}.pdf`;
    a.click(); URL.revokeObjectURL(url);
    setDownloading(false);
  }

  if (status === "loading" || loading) return <div style={{ padding: 24, color: "#8E8E93" }}>Generating report…</div>;
  if (!data) return <div style={{ padding: 24, color: "#FF3B30" }}>Failed to load report data.</div>;

  const { financial, grants, contacts, operations, compliance, domains } = data;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>
            {data.org?.name ?? "Organization"} — Board Report
          </h1>
          <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 6 }}>
            {data.reportPeriod} · Generated {new Date(data.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
          {data.org?.mission && (
            <p style={{ fontSize: 13, color: "#6E6E73", marginTop: 6, fontStyle: "italic", maxWidth: 540 }}>{data.org.mission}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} style={{ background: "#F5F5F7", color: "#1D1D1F", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            ↺ Refresh
          </button>
          <button onClick={downloadPDF} disabled={downloading}
            style={{ background: downloading ? "#8E8E93" : "#1D1D1F", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: downloading ? "wait" : "pointer" }}>
            {downloading ? "Generating PDF…" : "⬇ Download PDF"}
          </button>
        </div>
      </div>

      {/* Alert banners */}
      {(compliance.overdueReminders > 0 || domains.expiringSoon.length > 0) && (
        <div style={{ background: "#FF3B3008", border: "1.5px solid #FF3B3033", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#FF3B30", margin: "0 0 6px" }}>⚠ Requires Attention</p>
          {compliance.overdueReminders > 0 && (
            <p style={{ fontSize: 13, color: "#1D1D1F", margin: "0 0 4px" }}>• {compliance.overdueReminders} compliance deadline{compliance.overdueReminders > 1 ? "s" : ""} overdue</p>
          )}
          {domains.expiringSoon.map(d => (
            <p key={d.name} style={{ fontSize: 13, color: "#1D1D1F", margin: "0 0 2px" }}>
              • Domain <strong>{d.name}</strong> expires in {d.days} day{d.days !== 1 ? "s" : ""}
            </p>
          ))}
        </div>
      )}

      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Income",  value: fmt(financial.totalIncome),  color: "#007AFF" },
          { label: "Total Expenses", value: fmt(financial.totalExpenses), color: "#5856D6" },
          { label: financial.netPosition >= 0 ? "Surplus" : "Deficit", value: fmt(Math.abs(financial.netPosition)), color: financial.netPosition >= 0 ? "#34C759" : "#FF3B30" },
          { label: "Reserve Fund",  value: fmt(financial.reserveBalance), color: "#FF9500" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `3px solid ${s.color}` }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left col */}
        <div>
          <Section title="Financial Overview">
            <StatRow label="Gumroad Revenue"     value={fmt(financial.gumroadRevenue)} color="#34C759" />
            <StatRow label="Grant Awards"         value={fmt(financial.grantAwarded)}  color="#34C759" />
            <StatRow label="Donations"            value={fmt(financial.donationTotal)} color="#34C759" />
            <StatRow label="Contractor Payments"  value={fmt(financial.contractorSpend)} color="#FF9500" />
            <StatRow label="Staff Payroll"        value={fmt(financial.payrollTotal)}  color="#FF9500" />
            <div style={{ marginTop: 12, padding: "10px 0 0", borderTop: "2px solid #1D1D1F11" }}>
              <StatRow
                label="Net Position"
                value={`${financial.netPosition >= 0 ? "+" : ""}${fmt(financial.netPosition)}`}
                color={financial.netPosition >= 0 ? "#34C759" : "#FF3B30"}
              />
            </div>
          </Section>

          <Section title="Grants Pipeline">
            <StatRow label="Total Applications" value={String(grants.total)} />
            {Object.entries(grants.byStatus).map(([s, n]) => (
              <StatRow key={s} label={`  ${s.charAt(0).toUpperCase() + s.slice(1)}`} value={String(n)}
                color={s === "awarded" ? "#34C759" : s === "rejected" ? "#FF3B30" : undefined} />
            ))}
            <StatRow label="Total Awarded (USD)" value={fmt(grants.awardedAmount)} color="#34C759" />
          </Section>

          <Section title="Operations">
            <StatRow label="Total Hours Logged"  value={`${operations.totalHours.toFixed(1)}h`} />
            <StatRow label="  Staff Hours"       value={`${operations.staffHours.toFixed(1)}h`} />
            <StatRow label="  Volunteer Hours"   value={`${operations.volunteerHours.toFixed(1)}h`} color="#FF9500" />
            <StatRow label="Payroll Estimate"    value={fmt(operations.payrollTotal)} />
          </Section>
        </div>

        {/* Right col */}
        <div>
          <Section title="Donors & Contacts">
            <StatRow label="Total Contacts" value={String(contacts.total)} />
            {Object.entries(contacts.byType).map(([t, n]) => (
              <StatRow key={t} label={`  ${t.charAt(0).toUpperCase() + t.slice(1)}s`} value={String(n)} />
            ))}
            <StatRow label="Total Donated (all-time)" value={fmt(contacts.totalDonated)} color="#007AFF" />
          </Section>

          <Section title="Compliance">
            <StatRow label="Total Reminders"   value={String(compliance.totalReminders)} />
            <StatRow label="Overdue"           value={String(compliance.overdueReminders)} color={compliance.overdueReminders > 0 ? "#FF3B30" : undefined} />
            <StatRow label="Due in 90 days"    value={String(compliance.upcomingDeadlines.length)} color={compliance.upcomingDeadlines.length > 0 ? "#FF9500" : undefined} />
            {compliance.upcomingDeadlines.slice(0, 3).map((r) => (
              <div key={r.label} style={{ padding: "5px 0", fontSize: 12, color: "#6E6E73" }}>
                • {r.label} — {r.dueDate}
              </div>
            ))}
          </Section>

          <Section title="Domains">
            <StatRow label="Total Domains" value={String(domains.total)} />
            {domains.expiringSoon.length === 0 ? (
              <p style={{ fontSize: 13, color: "#34C759", margin: "8px 0 0" }}>✓ All domains safe (&gt; 60 days)</p>
            ) : domains.expiringSoon.map(d => (
              <StatRow key={d.name} label={d.name} value={`${d.days}d`} color={d.days < 14 ? "#FF3B30" : "#FF9500"} />
            ))}
          </Section>

          <Section title="Action Items">
            <StatRow label="Pending Approvals"  value={String(data.pendingApprovals)} color={data.pendingApprovals > 0 ? "#FF9500" : undefined} />
            <StatRow label="Inbox (unread)"      value={String(data.inboxPending)}    color={data.inboxPending > 0 ? "#007AFF" : undefined} />
            {data.pendingApprovals > 0 && <a href="/team" style={{ fontSize: 12, color: "#007AFF", display: "block", marginTop: 8 }}>Review pending approvals →</a>}
            {data.inboxPending > 0 && <a href="/inbox" style={{ fontSize: 12, color: "#007AFF", display: "block", marginTop: 4 }}>Clear inbox →</a>}
          </Section>
        </div>
      </div>

      <p style={{ fontSize: 11, color: "#C7C7CC", textAlign: "center", marginTop: 24 }}>
        This report is auto-generated from live data. <a href="/budget" style={{ color: "#8E8E93" }}>View Budget vs Actuals →</a>
      </p>
    </div>
  );
}
