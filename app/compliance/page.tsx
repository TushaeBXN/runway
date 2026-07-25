"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PROVIDER_PRESETS } from "@/lib/emailProviders";
import { TaxCalendar } from "./components/TaxCalendar";

// ── Types ────────────────────────────────────────────────────────────────────

interface BusinessInfo {
  businessName?: string; ein?: string; dunsNumber?: string; formationDate?: string;
  businessAddress?: string; poBox?: string; poBoxProvider?: string; domainName?: string;
  domainRegistrar?: string; phoneNumber?: string; phoneService?: string; website?: string;
  taxEntityType?: string; stateFiled?: string; creditScore?: string; tradeLineCount?: number;
}

interface Reminder {
  id: string; type: string; label: string; dueDate: string; recurrence: string;
  amount?: number; notes?: string; lastPaidDate?: string;
}

interface EmailAccount {
  id: string; label: string; provider: string; username: string; isActive: boolean; lastSynced?: string;
}

interface ConnectedService {
  id: string; service: string; label: string; isActive: boolean;
}

interface ComplianceData {
  businessInfo: BusinessInfo | null;
  reminders: Reminder[];
  emailAccounts: EmailAccount[];
  connectedServices: ConnectedService[];
}

const REMINDER_TYPES = [
  { id: "tax", icon: "🏛", label: "Tax Filing", defaultRecurrence: "annual" },
  { id: "pobox", icon: "📬", label: "PO Box Renewal", defaultRecurrence: "annual" },
  { id: "domain", icon: "🌐", label: "Domain Renewal", defaultRecurrence: "annual" },
  { id: "hosting", icon: "☁️", label: "Website Hosting", defaultRecurrence: "annual" },
  { id: "phone", icon: "📞", label: "Phone Service", defaultRecurrence: "monthly" },
  { id: "duns", icon: "🏢", label: "D-U-N-S Registration", defaultRecurrence: "once" },
  { id: "credit", icon: "💳", label: "Business Credit / Trade Line", defaultRecurrence: "once" },
  { id: "custom", icon: "📋", label: "Custom Reminder", defaultRecurrence: "annual" },
];

const PHONE_SERVICES = ["RingCentral", "Vonage", "Zoom Phone", "Google Voice", "Grasshopper", "OpenPhone", "Other"];
const TAX_ENTITIES = ["Nonprofit 501(c)(3)", "Nonprofit 501(c)(4)", "LLC", "S-Corp", "C-Corp", "Sole Proprietor", "Partnership"];
const EMAIL_PROVIDERS = [
  { id: "gmail", label: "Gmail / Google Workspace", icon: "G" },
  { id: "outlook", label: "Outlook / Microsoft 365", icon: "M" },
  { id: "yahoo", label: "Yahoo Mail", icon: "Y" },
  { id: "imap", label: "Other (IMAP)", icon: "✉" },
];

// ── Small components ─────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", ...style }}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: "0 0 16px" }}>{children}</h2>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>{children}</p>;
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: type === "password" ? "monospace" : "inherit" }} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box" }}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, color = "#1D1D1F", disabled = false }: { children: React.ReactNode; onClick: () => void; color?: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: disabled ? "#E5E5EA" : color, color: disabled ? "#8E8E93" : "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" }}>
      {children}
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ComplianceData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "business" | "email" | "services" | "reminders" | "calendar">("overview");
  const [seeding, setSeeding] = useState(false);

  // Business info state
  const [biz, setBiz] = useState<BusinessInfo>({});
  const [bizSaving, setBizSaving] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);

  // Reminder form
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminder, setNewReminder] = useState({ type: "tax", label: "", dueDate: "", recurrence: "annual", amount: "", notes: "" });
  const [reminderSaving, setReminderSaving] = useState(false);

  // Email form
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [emailProvider, setEmailProvider] = useState("gmail");
  const [emailForm, setEmailForm] = useState({ label: "", username: "", appPassword: "", host: "", port: "993" });
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  // Upwork form
  const [upworkKey, setUpworkKey] = useState("");
  const [upworkSaving, setUpworkSaving] = useState(false);
  const [upworkSaved, setUpworkSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchData();
  }, [status]);

  async function fetchData() {
    const res = await fetch("/api/compliance");
    const d: ComplianceData = await res.json();
    setData(d);
    if (d.businessInfo) setBiz(d.businessInfo);
  }

  async function saveBiz() {
    setBizSaving(true);
    await fetch("/api/compliance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "business_info", data: biz }) });
    setBizSaved(true);
    setTimeout(() => setBizSaved(false), 3000);
    setBizSaving(false);
    fetchData();
  }

  async function addReminder() {
    setReminderSaving(true);
    await fetch("/api/compliance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "reminder", data: { ...newReminder, amount: newReminder.amount ? parseFloat(newReminder.amount) : null } }) });
    setShowAddReminder(false);
    setNewReminder({ type: "tax", label: "", dueDate: "", recurrence: "annual", amount: "", notes: "" });
    setReminderSaving(false);
    fetchData();
  }

  async function markPaid(id: string) {
    await fetch("/api/compliance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "paid_reminder", id }) });
    fetchData();
  }

  async function deleteReminder(id: string) {
    await fetch("/api/compliance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "delete_reminder", id }) });
    fetchData();
  }

  async function seedDeadlines(replace: boolean) {
    if (!biz.taxEntityType) return;
    setSeeding(true);
    await fetch("/api/compliance/seed-deadlines", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: biz.taxEntityType, replace }),
    });
    setSeeding(false);
    fetchData();
  }

  async function testEmailConnection() {
    setEmailTesting(true);
    setEmailTestResult(null);
    const preset = PROVIDER_PRESETS[emailProvider];
    const host = emailProvider === "imap" ? emailForm.host : preset.host;
    const res = await fetch("/api/email-accounts/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host, port: parseInt(emailForm.port) || 993, username: emailForm.username, appPassword: emailForm.appPassword }) });
    const result = await res.json();
    setEmailTestResult(result);
    setEmailTesting(false);
  }

  async function saveEmailAccount() {
    setEmailSaving(true);
    const preset = PROVIDER_PRESETS[emailProvider];
    const host = emailProvider === "imap" ? emailForm.host : preset.host;
    await fetch("/api/email-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: emailForm.label || emailForm.username, provider: emailProvider, host, port: parseInt(emailForm.port) || 993, username: emailForm.username, appPassword: emailForm.appPassword }) });
    setShowAddEmail(false);
    setEmailForm({ label: "", username: "", appPassword: "", host: "", port: "993" });
    setEmailTestResult(null);
    setEmailSaving(false);
    fetchData();
  }

  async function removeEmailAccount(id: string) {
    await fetch("/api/email-accounts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchData();
  }

  async function saveUpwork() {
    setUpworkSaving(true);
    await fetch("/api/connected-services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service: "upwork", label: "Upwork", credentials: { apiKey: upworkKey } }) });
    setUpworkKey("");
    setUpworkSaved(true);
    setTimeout(() => setUpworkSaved(false), 3000);
    setUpworkSaving(false);
    fetchData();
  }

  if (status === "loading" || !data) return <div style={{ padding: 24, color: "#8E8E93" }}>Loading…</div>;

  const today = new Date();
  const upcomingReminders = data.reminders.filter(r => {
    if (!r.dueDate) return false;
    // For MM-DD format, check if due within 30 days
    if (r.dueDate.match(/^\d{2}-\d{2}$/)) {
      const [mm, dd] = r.dueDate.split("-").map(Number);
      const thisYear = new Date(today.getFullYear(), mm - 1, dd);
      const nextYear = new Date(today.getFullYear() + 1, mm - 1, dd);
      const target = thisYear > today ? thisYear : nextYear;
      const daysUntil = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 60;
    }
    return false;
  });

  const upworkConnected = data.connectedServices.find(s => s.service === "upwork" && s.isActive);
  const preset = PROVIDER_PRESETS[emailProvider];

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "calendar", label: "Tax Calendar" },
    { id: "business", label: "Business ID" },
    { id: "email", label: "Email Accounts" },
    { id: "services", label: "Connected Services" },
    { id: "reminders", label: "Deadlines" },
  ] as const;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.5px" }}>Compliance & Operations</h1>
        <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>Business identity, connected accounts, deadlines, and receipt reminders.</p>
      </div>

      {/* Daily receipt reminder banner */}
      <div style={{ background: "linear-gradient(135deg, #1D1D1F, #3D3D3F)", borderRadius: 16, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 28 }}>🧾</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>Daily Receipt Reminder</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", margin: "3px 0 0" }}>
            Did you pay for anything today? Take a photo of the receipt — every business expense is a tax deduction.
          </p>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F5F5F7", borderRadius: 12, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flex: 1, padding: "8px 4px", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", background: activeTab === t.id ? "#fff" : "transparent", color: activeTab === t.id ? "#1D1D1F" : "#6E6E73", boxShadow: activeTab === t.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW tab ── */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Status cards row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Card>
              <p style={{ fontSize: 12, color: "#8E8E93", margin: "0 0 6px" }}>EIN</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: biz.ein ? "#1D1D1F" : "#FF3B30" }}>{biz.ein || "Not set"}</p>
            </Card>
            <Card>
              <p style={{ fontSize: 12, color: "#8E8E93", margin: "0 0 6px" }}>D-U-N-S Number</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: biz.dunsNumber ? "#34C759" : "#FF9500" }}>{biz.dunsNumber || "Not registered"}</p>
            </Card>
            <Card>
              <p style={{ fontSize: 12, color: "#8E8E93", margin: "0 0 6px" }}>Trade Lines</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F" }}>{biz.tradeLineCount ?? 0}</p>
            </Card>
          </div>

          {/* Upcoming deadlines */}
          <Card>
            <SectionTitle>Upcoming in 60 Days</SectionTitle>
            {upcomingReminders.length === 0 ? (
              <p style={{ fontSize: 14, color: "#8E8E93" }}>No deadlines in the next 60 days. Add them in the Deadlines tab.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {upcomingReminders.map(r => {
                  const rType = REMINDER_TYPES.find(t => t.id === r.type);
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#FFF8EE", borderRadius: 10, border: "1.5px solid #FFCD39" }}>
                      <span style={{ fontSize: 20 }}>{rType?.icon ?? "📋"}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>{r.label}</p>
                        <p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0" }}>Due: {r.dueDate} · {r.recurrence}{r.amount ? ` · $${r.amount}` : ""}</p>
                      </div>
                      <button onClick={() => markPaid(r.id)} style={{ fontSize: 12, fontWeight: 700, color: "#34C759", background: "#F0FFF4", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>✓ Mark Paid</button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Connections */}
          <Card>
            <SectionTitle>Connected Accounts</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Email */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1.5px solid #E5E5EA", borderRadius: 12 }}>
                <span style={{ fontSize: 20 }}>✉</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>Email Accounts</p>
                  <p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0" }}>{data.emailAccounts.length > 0 ? data.emailAccounts.map(e => e.label).join(", ") : "No accounts connected"}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: data.emailAccounts.length > 0 ? "#34C759" : "#FF9500" }}>{data.emailAccounts.length > 0 ? `${data.emailAccounts.length} connected` : "Not connected"}</span>
              </div>

              {/* Upwork */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1.5px solid #E5E5EA", borderRadius: 12 }}>
                <span style={{ fontSize: 20 }}>💼</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>Upwork</p>
                  <p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0" }}>{upworkConnected ? "API key connected" : "Not connected — agents can't post or bid on jobs"}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: upworkConnected ? "#34C759" : "#FF9500" }}>{upworkConnected ? "✓ Connected" : "Not connected"}</span>
              </div>
            </div>
          </Card>

          {/* Business credit guidance */}
          <Card style={{ background: "#F0FFF4", border: "1.5px solid #34C759" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: "0 0 8px" }}>💳 Build Your Business Credit</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { step: "1", task: "Register for a free D-U-N-S number at dnb.com/duns-number", done: !!biz.dunsNumber },
                { step: "2", task: "Open a business bank account in your org's legal name", done: false },
                { step: "3", task: "Apply for net-30 vendor accounts (Uline, Quill, Grainger)", done: (biz.tradeLineCount ?? 0) >= 1 },
                { step: "4", task: "Get 3+ trade lines reporting to Dun & Bradstreet", done: (biz.tradeLineCount ?? 0) >= 3 },
                { step: "5", task: "Apply for a business credit card after 6 months of history", done: false },
              ].map(item => (
                <div key={item.step} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 14, color: item.done ? "#34C759" : "#8E8E93", minWidth: 16 }}>{item.done ? "✓" : "○"}</span>
                  <p style={{ fontSize: 13, color: item.done ? "#8E8E93" : "#1D1D1F", margin: 0, textDecoration: item.done ? "line-through" : "none" }}>{item.task}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── TAX CALENDAR tab ── */}
      {activeTab === "calendar" && (
        <TaxCalendar
          reminders={data.reminders}
          entityType={biz.taxEntityType ?? ""}
          onSeedDeadlines={seedDeadlines}
          onMarkPaid={markPaid}
          onDelete={deleteReminder}
          seeding={seeding}
        />
      )}

      {/* ── BUSINESS ID tab ── */}
      {activeTab === "business" && (
        <Card>
          <SectionTitle>Business Identity</SectionTitle>
          <p style={{ fontSize: 13, color: "#6E6E73", marginBottom: 20 }}>This information is used by your agents for grant applications, donor communications, and compliance reminders.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Input label="Legal Business Name" value={biz.businessName ?? ""} onChange={v => setBiz(p => ({ ...p, businessName: v }))} placeholder="Winston-Salem Tech Education Inc." />
            <Input label="EIN (Employer ID Number)" value={biz.ein ?? ""} onChange={v => setBiz(p => ({ ...p, ein: v }))} placeholder="XX-XXXXXXX" />
            <Input label="D-U-N-S Number" value={biz.dunsNumber ?? ""} onChange={v => setBiz(p => ({ ...p, dunsNumber: v }))} placeholder="9-digit D-U-N-S number" />
            <Input label="Formation Date" value={biz.formationDate ?? ""} onChange={v => setBiz(p => ({ ...p, formationDate: v }))} placeholder="MM/DD/YYYY" />
            <Select label="Tax Entity Type" value={biz.taxEntityType ?? ""} onChange={v => setBiz(p => ({ ...p, taxEntityType: v }))} options={TAX_ENTITIES} />
            <Input label="State Filed In" value={biz.stateFiled ?? ""} onChange={v => setBiz(p => ({ ...p, stateFiled: v }))} placeholder="North Carolina" />
            <div style={{ gridColumn: "1 / -1" }}>
              <Input label="Business Address" value={biz.businessAddress ?? ""} onChange={v => setBiz(p => ({ ...p, businessAddress: v }))} placeholder="123 Main St, Winston-Salem, NC 27101" />
            </div>
            <Input label="PO Box" value={biz.poBox ?? ""} onChange={v => setBiz(p => ({ ...p, poBox: v }))} placeholder="PO Box 1234, Winston-Salem, NC" />
            <Input label="PO Box Provider" value={biz.poBoxProvider ?? ""} onChange={v => setBiz(p => ({ ...p, poBoxProvider: v }))} placeholder="USPS, UPS Store, etc." />
            <Input label="Domain Name" value={biz.domainName ?? ""} onChange={v => setBiz(p => ({ ...p, domainName: v }))} placeholder="yourorg.org" />
            <Input label="Domain Registrar" value={biz.domainRegistrar ?? ""} onChange={v => setBiz(p => ({ ...p, domainRegistrar: v }))} placeholder="GoDaddy, Namecheap, Google Domains" />
            <Input label="Website" value={biz.website ?? ""} onChange={v => setBiz(p => ({ ...p, website: v }))} placeholder="https://yourorg.org" />
            <Select label="Phone Service" value={biz.phoneService ?? ""} onChange={v => setBiz(p => ({ ...p, phoneService: v }))} options={PHONE_SERVICES} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Input label="Business Phone Number" value={biz.phoneNumber ?? ""} onChange={v => setBiz(p => ({ ...p, phoneNumber: v }))} placeholder="(336) 555-0000" />
            </div>
            <Input label="Business Credit Score" value={biz.creditScore ?? ""} onChange={v => setBiz(p => ({ ...p, creditScore: v }))} placeholder="Paydex score or credit score" />
            <div>
              <Label>Trade Lines Established</Label>
              <input type="number" value={biz.tradeLineCount ?? 0} onChange={e => setBiz(p => ({ ...p, tradeLineCount: parseInt(e.target.value) || 0 }))} min={0}
                style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, borderTop: "1px solid #F0F0F0", paddingTop: 20 }}>
            <Btn onClick={saveBiz} disabled={bizSaving}>{bizSaving ? "Saving…" : "Save Business Info"}</Btn>
            {bizSaved && <span style={{ fontSize: 13, color: "#34C759", fontWeight: 600 }}>✅ Saved</span>}
          </div>
        </Card>
      )}

      {/* ── EMAIL ACCOUNTS tab ── */}
      {activeTab === "email" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.emailAccounts.length === 0 && !showAddEmail && (
            <Card style={{ textAlign: "center" }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>✉</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F" }}>No email accounts connected</p>
              <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 4, marginBottom: 16 }}>Connect an inbox so the Inbox Agent can read real emails and draft responses for your review.</p>
              <Btn onClick={() => setShowAddEmail(true)}>Connect Email Account</Btn>
            </Card>
          )}

          {data.emailAccounts.map(acct => (
            <Card key={acct.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✉</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>{acct.label}</p>
                <p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0" }}>{acct.username} · {acct.provider}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#34C759" }}>✓ Connected</span>
              <button onClick={() => removeEmailAccount(acct.id)} style={{ fontSize: 12, color: "#FF3B30", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Remove</button>
            </Card>
          ))}

          {data.emailAccounts.length > 0 && !showAddEmail && (
            <button onClick={() => setShowAddEmail(true)} style={{ background: "none", border: "2px dashed #E5E5EA", borderRadius: 16, padding: "16px", fontSize: 14, fontWeight: 600, color: "#6E6E73", cursor: "pointer" }}>
              + Connect Another Account
            </button>
          )}

          {showAddEmail && (
            <Card>
              <SectionTitle>Connect Email Account</SectionTitle>

              {/* Provider picker */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                {EMAIL_PROVIDERS.map(p => (
                  <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: `2px solid ${emailProvider === p.id ? "#1D1D1F" : "#E5E5EA"}`, borderRadius: 12, cursor: "pointer", background: emailProvider === p.id ? "#F5F5F7" : "#fff" }}>
                    <input type="radio" name="emailProvider" value={p.id} checked={emailProvider === p.id} onChange={() => { setEmailProvider(p.id); setEmailTestResult(null); }} style={{ accentColor: "#1D1D1F" }} />
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#1D1D1F", minWidth: 20, textAlign: "center" }}>{p.icon}</span>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>{p.label}</p>
                  </label>
                ))}
              </div>

              {/* Step-by-step instructions */}
              <div style={{ background: "#F5F5F7", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "0 0 10px" }}>How to get your App Password:</p>
                {preset.steps.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <span style={{ minWidth: 20, height: 20, background: "#1D1D1F", color: "#fff", borderRadius: "50%", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                    <p style={{ fontSize: 13, color: "#1D1D1F", margin: 0, lineHeight: 1.5 }}>{step}</p>
                  </div>
                ))}
              </div>

              {/* Security warning */}
              <div style={{ background: "#FFF3CD", border: "1.5px solid #FFCD39", borderRadius: 12, padding: "12px 16px", display: "flex", gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 18 }}>🔒</span>
                <p style={{ fontSize: 13, color: "#856404", margin: 0 }}>
                  <strong>Use an App Password, not your real email password.</strong> App passwords only give access to email — they can&apos;t change your account settings or password. Never share your real password.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Input label="Account Label" value={emailForm.label} onChange={v => setEmailForm(p => ({ ...p, label: v }))} placeholder="e.g. Org Gmail" />
                <Input label="Email Address" value={emailForm.username} onChange={v => setEmailForm(p => ({ ...p, username: v }))} placeholder="hello@yourorg.org" />
                <Input label="App Password" value={emailForm.appPassword} onChange={v => setEmailForm(p => ({ ...p, appPassword: v }))} type="password" placeholder="xxxx xxxx xxxx xxxx" />
                {emailProvider === "imap" && (
                  <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 12 }}>
                    <Input label="IMAP Host" value={emailForm.host} onChange={v => setEmailForm(p => ({ ...p, host: v }))} placeholder="mail.yourprovider.com" />
                    <Input label="Port" value={emailForm.port} onChange={v => setEmailForm(p => ({ ...p, port: v }))} placeholder="993" />
                  </div>
                )}
              </div>

              {emailTestResult && (
                <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: emailTestResult.ok ? "#F0FFF4" : "#FFF0F0", border: `1.5px solid ${emailTestResult.ok ? "#34C759" : "#FF3B30"}` }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: emailTestResult.ok ? "#34C759" : "#FF3B30", margin: 0 }}>
                    {emailTestResult.ok ? "✓ Connection successful! Your inbox is ready." : `✗ Connection failed: ${emailTestResult.error}`}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <Btn onClick={testEmailConnection} disabled={emailTesting} color="#007AFF">{emailTesting ? "Testing…" : "Test Connection"}</Btn>
                {emailTestResult?.ok && <Btn onClick={saveEmailAccount} disabled={emailSaving}>{emailSaving ? "Saving…" : "Save Account"}</Btn>}
                <button onClick={() => { setShowAddEmail(false); setEmailTestResult(null); }} style={{ background: "none", border: "none", fontSize: 14, color: "#8E8E93", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── CONNECTED SERVICES tab ── */}
      {activeTab === "services" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Upwork */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#14A800", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff" }}>💼</div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Upwork</p>
                <p style={{ fontSize: 13, color: "#8E8E93", margin: "2px 0 0" }}>{upworkConnected ? "API key connected — agents can scout and execute jobs" : "Connect your API key so agents can find and complete work on weekends"}</p>
              </div>
              {upworkConnected && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#34C759" }}>✓ Connected</span>}
            </div>

            {/* Instructions */}
            <div style={{ background: "#F5F5F7", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "0 0 10px" }}>How to get your Upwork API key:</p>
              {[
                "Go to upwork.com and sign in to your freelancer account",
                "Click your profile photo → Settings → Connected Apps",
                'Scroll to "Upwork API" and click "Get API Access"',
                'Create a new app — name it "Runway" with redirect URL http://localhost:3000',
                "Copy the API Key and paste it below",
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ minWidth: 20, height: 20, background: "#1D1D1F", color: "#fff", borderRadius: "50%", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                  <p style={{ fontSize: 13, color: "#1D1D1F", margin: 0, lineHeight: 1.5 }}>{step}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <Label>Upwork API Key</Label>
                <input type="password" value={upworkKey} onChange={e => setUpworkKey(e.target.value)} placeholder={upworkConnected ? "API key saved — paste new key to replace" : "Paste your Upwork API key"}
                  style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
              </div>
              <Btn onClick={saveUpwork} disabled={upworkSaving || !upworkKey}>{upworkSaving ? "Saving…" : "Save"}</Btn>
              {upworkSaved && <span style={{ fontSize: 13, color: "#34C759", fontWeight: 600 }}>✅ Saved</span>}
            </div>
          </Card>

          {/* Future services */}
          {[
            { icon: "📊", name: "QuickBooks", desc: "Sync expenses and income for tax prep — coming soon", color: "#2CA01C" },
            { icon: "📧", name: "Mailchimp", desc: "Let the Marketing Agent send approved campaigns — coming soon", color: "#FFE01B" },
            { icon: "📋", name: "Notion", desc: "Sync tasks and documents to your Notion workspace — coming soon", color: "#000" },
          ].map(svc => (
            <Card key={svc.name} style={{ display: "flex", alignItems: "center", gap: 14, opacity: 0.6 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: svc.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{svc.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>{svc.name}</p>
                <p style={{ fontSize: 13, color: "#8E8E93", margin: "2px 0 0" }}>{svc.desc}</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", background: "#F5F5F7", padding: "3px 10px", borderRadius: 6 }}>COMING SOON</span>
            </Card>
          ))}
        </div>
      )}

      {/* ── DEADLINES tab ── */}
      {activeTab === "reminders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 14, color: "#6E6E73", margin: 0 }}>Set due dates once — Runway reminds you every year automatically.</p>
            <Btn onClick={() => setShowAddReminder(true)}>+ Add Deadline</Btn>
          </div>

          {data.reminders.length === 0 && !showAddReminder && (
            <Card style={{ textAlign: "center" }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📅</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F" }}>No deadlines yet</p>
              <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 4 }}>Add your tax filing date, PO Box renewal, domain expiry, and phone service payment so you never miss them.</p>
            </Card>
          )}

          {data.reminders.map(r => {
            const rType = REMINDER_TYPES.find(t => t.id === r.type);
            return (
              <Card key={r.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 24 }}>{rType?.icon ?? "📋"}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>{r.label}</p>
                  <p style={{ fontSize: 12, color: "#8E8E93", margin: "3px 0 0" }}>
                    Due: <strong>{r.dueDate}</strong> · {r.recurrence}
                    {r.amount ? ` · $${r.amount}` : ""}
                    {r.lastPaidDate ? ` · Last paid: ${new Date(r.lastPaidDate).toLocaleDateString()}` : ""}
                  </p>
                  {r.notes && <p style={{ fontSize: 12, color: "#6E6E73", margin: "3px 0 0" }}>{r.notes}</p>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => markPaid(r.id)} style={{ fontSize: 12, fontWeight: 700, color: "#34C759", background: "#F0FFF4", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>✓ Paid</button>
                  <button onClick={() => deleteReminder(r.id)} style={{ fontSize: 12, fontWeight: 700, color: "#FF3B30", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </div>
              </Card>
            );
          })}

          {showAddReminder && (
            <Card>
              <SectionTitle>Add Deadline</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <Label>Type</Label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {REMINDER_TYPES.map(t => (
                      <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: `2px solid ${newReminder.type === t.id ? "#1D1D1F" : "#E5E5EA"}`, borderRadius: 10, cursor: "pointer", background: newReminder.type === t.id ? "#F5F5F7" : "#fff", fontSize: 13, fontWeight: 600 }}>
                        <input type="radio" name="reminderType" value={t.id} checked={newReminder.type === t.id} onChange={() => setNewReminder(p => ({ ...p, type: t.id, recurrence: t.defaultRecurrence }))} style={{ accentColor: "#1D1D1F" }} />
                        <span>{t.icon} {t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Input label="Label" value={newReminder.label} onChange={v => setNewReminder(p => ({ ...p, label: v }))} placeholder='e.g. "IRS 990 Tax Filing" or "GoDaddy Domain Renewal"' />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Input label='Due Date (MM-DD for annual)' value={newReminder.dueDate} onChange={v => setNewReminder(p => ({ ...p, dueDate: v }))} placeholder="04-15" />
                  <div>
                    <Label>Recurrence</Label>
                    <select value={newReminder.recurrence} onChange={e => setNewReminder(p => ({ ...p, recurrence: e.target.value }))}
                      style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box" }}>
                      <option value="annual">Annual</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="once">One-time</option>
                    </select>
                  </div>
                  <Input label="Amount ($)" value={newReminder.amount} onChange={v => setNewReminder(p => ({ ...p, amount: v }))} placeholder="Optional" />
                </div>
                <Input label="Notes" value={newReminder.notes} onChange={v => setNewReminder(p => ({ ...p, notes: v }))} placeholder="Optional notes" />
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn onClick={addReminder} disabled={reminderSaving || !newReminder.label || !newReminder.dueDate}>{reminderSaving ? "Saving…" : "Add Reminder"}</Btn>
                  <button onClick={() => setShowAddReminder(false)} style={{ background: "none", border: "none", fontSize: 14, color: "#8E8E93", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
