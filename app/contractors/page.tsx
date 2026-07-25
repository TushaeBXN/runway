"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const TAX_YEAR = new Date().getFullYear();
const THRESHOLD = 600;
const PAYMENT_METHODS = ["ACH / Direct Deposit", "Check", "Wire Transfer", "PayPal", "Venmo Business", "Zelle", "Cash", "Other"];

interface Payment {
  id: string; amount: number; paidOn: string; description?: string; method?: string; reference?: string;
}

interface Contractor {
  id: string; name: string; email?: string; ein?: string; address?: string;
  businessName?: string; totalPaid: number; needs1099: boolean; form1099Sent: boolean;
  sentAt?: string; notes?: string; payments: Payment[];
}

function pct(paid: number) { return Math.min(100, Math.round((paid / THRESHOLD) * 100)); }

function ProgressBar({ paid }: { paid: number }) {
  const p = pct(paid);
  const color = paid >= THRESHOLD ? "#FF3B30" : paid >= THRESHOLD * 0.75 ? "#FF9500" : "#007AFF";
  return (
    <div style={{ background: "#F0F0F0", borderRadius: 6, height: 6, overflow: "hidden", margin: "6px 0" }}>
      <div style={{ height: "100%", width: `${p}%`, background: color, borderRadius: 6, transition: "width 0.4s" }} />
    </div>
  );
}

export default function ContractorsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Add contractor form
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", ein: "", address: "", businessName: "", notes: "" });
  const [saving, setSaving] = useState(false);

  // Add payment form
  const [payForm, setPayForm] = useState({ contractorId: "", amount: "", paidOn: new Date().toISOString().slice(0, 10), description: "", method: "ACH / Direct Deposit", reference: "" });
  const [showPayForm, setShowPayForm] = useState<string | null>(null);
  const [paySaving, setPaySaving] = useState(false);

  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") load();
  }, [status]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/contractors");
    setContractors(await res.json());
    setLoading(false);
  }

  async function addContractor() {
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch("/api/contractors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_contractor", ...form }) });
    setForm({ name: "", email: "", ein: "", address: "", businessName: "", notes: "" });
    setShowAdd(false);
    setSaving(false);
    load();
  }

  async function addPayment(contractorId: string) {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) return;
    setPaySaving(true);
    const res = await fetch(`/api/contractors/${contractorId}/payments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_payment", ...payForm, amount: parseFloat(payForm.amount) }),
    });
    const { thresholdHit } = await res.json();
    if (thresholdHit) alert(`⚠️ This contractor has now passed the $600 threshold. A 1099-NEC will be required by January 31.`);
    setPayForm({ contractorId: "", amount: "", paidOn: new Date().toISOString().slice(0, 10), description: "", method: "ACH / Direct Deposit", reference: "" });
    setShowPayForm(null);
    setPaySaving(false);
    load();
  }

  async function mark1099Sent(contractorId: string) {
    setMarking(contractorId);
    await fetch("/api/contractors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_1099_sent", contractorId }) });
    setMarking(null);
    load();
  }

  async function deleteContractor(contractorId: string) {
    if (!confirm("Remove this contractor from the current tax year?")) return;
    await fetch("/api/contractors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_contractor", contractorId }) });
    load();
  }

  async function deletePayment(contractorId: string, paymentId: string) {
    await fetch(`/api/contractors/${contractorId}/payments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_payment", paymentId }),
    });
    load();
  }

  if (status === "loading" || loading) return <div style={{ padding: 24, color: "#8E8E93" }}>Loading…</div>;

  const needs1099 = contractors.filter((c) => c.needs1099 && !c.form1099Sent);
  const sent = contractors.filter((c) => c.form1099Sent);
  const below = contractors.filter((c) => !c.needs1099);
  const totalPaidOut = contractors.reduce((s, c) => s + c.totalPaid, 0);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.5px" }}>1099 Contractor Tracker</h1>
        <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>Tax Year {TAX_YEAR} · IRS reporting threshold: ${THRESHOLD}. Contractors paid $600+ require a Form 1099-NEC by January 31.</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Contractors", value: contractors.length, color: "#1D1D1F" },
          { label: "Need 1099-NEC", value: needs1099.length, color: needs1099.length > 0 ? "#FF3B30" : "#34C759" },
          { label: "1099s Filed", value: sent.length, color: "#34C759" },
          { label: "Total Paid Out", value: `$${totalPaidOut.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "#007AFF" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#8E8E93", marginTop: 3, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        {needs1099.length > 0 && (
          <div style={{ background: "#FFF3E0", border: "1.5px solid #FF9500", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#E65100", display: "flex", alignItems: "center", gap: 6 }}>
            ⚠️ {needs1099.length} contractor{needs1099.length !== 1 ? "s" : ""} passed $600 — 1099-NEC required by Jan 31
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowAdd(!showAdd)}
          style={{ background: "#1D1D1F", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Add Contractor
        </button>
      </div>

      {/* Add contractor form */}
      {showAdd && (
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: "0 0 16px" }}>New Contractor</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[
              { label: "Full Name *", key: "name", placeholder: "Jane Smith" },
              { label: "Business Name", key: "businessName", placeholder: "Smith Consulting LLC" },
              { label: "Email", key: "email", placeholder: "jane@example.com" },
              { label: "EIN / SSN (last 4)", key: "ein", placeholder: "XX-XXXXXXX or ···-··-1234" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 5px" }}>{label}</p>
                <input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder}
                  style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 5px" }}>Mailing Address</p>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City, ST 12345"
              style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 5px" }}>Notes</p>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes"
              style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={addContractor} disabled={!form.name.trim() || saving}
              style={{ background: saving || !form.name.trim() ? "#E5E5EA" : "#1D1D1F", color: saving || !form.name.trim() ? "#8E8E93" : "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {saving ? "Saving…" : "Add Contractor"}
            </button>
            <button onClick={() => setShowAdd(false)}
              style={{ background: "transparent", color: "#8E8E93", border: "none", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Contractor list */}
      {contractors.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: "48px 24px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: "0 0 8px" }}>No contractors yet</p>
          <p style={{ fontSize: 13, color: "#8E8E93" }}>Add contractors you pay throughout the year. The tracker alerts you when anyone crosses the $600 IRS threshold.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {contractors.map((c) => {
            const isExpanded = expandedId === c.id;
            const p = pct(c.totalPaid);
            const barColor = c.totalPaid >= THRESHOLD ? "#FF3B30" : c.totalPaid >= THRESHOLD * 0.75 ? "#FF9500" : "#007AFF";
            const badge = c.form1099Sent ? { label: "1099 Filed", bg: "#E8F8EF", color: "#34C759" }
              : c.needs1099 ? { label: "1099 REQUIRED", bg: "#FFF0F0", color: "#FF3B30" }
              : c.totalPaid >= THRESHOLD * 0.75 ? { label: "Approaching $600", bg: "#FFF8EE", color: "#FF9500" }
              : { label: "Below threshold", bg: "#F5F5F7", color: "#8E8E93" };

            return (
              <div key={c.id} style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${c.needs1099 && !c.form1099Sent ? "#FF3B3022" : "#F0F0F0"}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                {/* Contractor row */}
                <div onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    👤
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F" }}>{c.name}</span>
                      {c.businessName && <span style={{ fontSize: 12, color: "#8E8E93" }}>· {c.businessName}</span>}
                      <span style={{ fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color, borderRadius: 8, padding: "2px 8px" }}>{badge.label}</span>
                    </div>
                    <ProgressBar paid={c.totalPaid} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8E8E93" }}>
                      <span>{c.payments.length} payment{c.payments.length !== 1 ? "s" : ""}</span>
                      <span style={{ fontWeight: 700, color: barColor }}>${c.totalPaid.toFixed(2)} / ${THRESHOLD} ({p}%)</span>
                    </div>
                  </div>
                  <div style={{ color: "#C7C7CC", fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #F0F0F0", background: "#FAFAFA" }}>
                    {/* Info row */}
                    <div style={{ padding: "12px 18px", display: "flex", gap: 20, fontSize: 12, color: "#6E6E73", flexWrap: "wrap" }}>
                      {c.email && <span>✉️ {c.email}</span>}
                      {c.ein && <span>🪪 EIN: {c.ein}</span>}
                      {c.address && <span>📍 {c.address}</span>}
                      {c.notes && <span>📝 {c.notes}</span>}
                      {c.form1099Sent && c.sentAt && <span>✅ 1099 filed {new Date(c.sentAt).toLocaleDateString()}</span>}
                    </div>

                    {/* Payment list */}
                    {c.payments.length > 0 && (
                      <div style={{ padding: "0 18px 12px" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 8px" }}>Payments</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {c.payments.map((pay) => (
                            <div key={pay.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 9, padding: "8px 12px", border: "1px solid #F0F0F0" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#34C759", minWidth: 80 }}>${pay.amount.toFixed(2)}</span>
                              <span style={{ fontSize: 12, color: "#8E8E93", flex: 1 }}>{new Date(pay.paidOn).toLocaleDateString()} {pay.description ? `· ${pay.description}` : ""} {pay.method ? `· ${pay.method}` : ""} {pay.reference ? `(ref: ${pay.reference})` : ""}</span>
                              <button onClick={() => deletePayment(c.id, pay.id)} style={{ background: "none", border: "none", color: "#FF3B30", cursor: "pointer", fontSize: 12 }}>✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add payment form */}
                    {showPayForm === c.id ? (
                      <div style={{ padding: "12px 18px 14px", borderTop: "1px solid #F0F0F0" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "0 0 10px" }}>Add Payment</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 4px" }}>Amount *</p>
                            <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder="0.00"
                              style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 4px" }}>Date Paid *</p>
                            <input type="date" value={payForm.paidOn} onChange={(e) => setPayForm({ ...payForm, paidOn: e.target.value })}
                              style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 4px" }}>Method</p>
                            <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                              style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", background: "#fff", boxSizing: "border-box" }}>
                              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 4px" }}>Description</p>
                            <input value={payForm.description} onChange={(e) => setPayForm({ ...payForm, description: e.target.value })} placeholder="e.g. Logo design, May invoice"
                              style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 4px" }}>Reference #</p>
                            <input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Check #, transaction ID"
                              style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => addPayment(c.id)} disabled={!payForm.amount || paySaving}
                            style={{ background: "#1D1D1F", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            {paySaving ? "Saving…" : "Record Payment"}
                          </button>
                          <button onClick={() => setShowPayForm(null)} style={{ background: "none", border: "none", color: "#8E8E93", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: "10px 18px 14px", display: "flex", gap: 8 }}>
                        <button onClick={() => setShowPayForm(c.id)}
                          style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          + Add Payment
                        </button>
                        {c.needs1099 && !c.form1099Sent && (
                          <button onClick={() => mark1099Sent(c.id)} disabled={marking === c.id}
                            style={{ background: "#34C759", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            {marking === c.id ? "…" : "✓ Mark 1099 Filed"}
                          </button>
                        )}
                        <button onClick={() => deleteContractor(c.id)}
                          style={{ background: "transparent", color: "#FF3B30", border: "1.5px solid #FF3B30", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* IRS info footer */}
      <div style={{ background: "#F5F5F7", borderRadius: 14, padding: "16px 20px", marginTop: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "0 0 6px" }}>IRS 1099-NEC Quick Reference</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            "File 1099-NEC for any independent contractor paid $600+ during the tax year",
            "Deadline: January 31 — both to the contractor and to the IRS (same date)",
            "E-file via IRS FIRE system or a 1099 service (Track1099, Tax1099, etc.)",
            "Corporations (Inc./LLC taxed as corp) generally do NOT need a 1099 — but LLCs as sole prop DO",
            "Collect Form W-9 from every contractor before you pay them — required for accurate filing",
          ].map((tip, i) => (
            <p key={i} style={{ fontSize: 12, color: "#6E6E73", margin: 0 }}>· {tip}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
