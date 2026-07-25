"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Domain {
  id: string;
  name: string;
  registrar?: string | null;
  registeredAt?: string | null;
  expiresAt: string;
  autoRenew: boolean;
  sslExpiresAt?: string | null;
  hostingProvider?: string | null;
  hostingExpiresAt?: string | null;
  notes?: string | null;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function urgency(days: number): { label: string; color: string; bg: string; dot: string } {
  if (days < 0)  return { label: "EXPIRED",   color: "#fff",     bg: "#FF3B30", dot: "#FF3B30" };
  if (days < 14) return { label: "CRITICAL",  color: "#FF3B30",  bg: "#FF3B3011", dot: "#FF3B30" };
  if (days < 30) return { label: "WARNING",   color: "#FF9500",  bg: "#FF950011", dot: "#FF9500" };
  if (days < 60) return { label: "WATCH",     color: "#FFCC00",  bg: "#FFCC0011", dot: "#FFCC00" };
  return           { label: "OK",          color: "#34C759",  bg: "#34C75911", dot: "#34C759" };
}

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

const EMPTY_FORM = {
  name: "", registrar: "", registeredAt: "", expiresAt: "",
  autoRenew: false, sslExpiresAt: "", hostingProvider: "", hostingExpiresAt: "", notes: "",
};

type FormState = typeof EMPTY_FORM;

export default function DomainsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") load();
  }, [status]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/domains");
    const d = await res.json();
    setDomains(d.domains ?? []);
    setLoading(false);
  }, []);

  function startEdit(domain: Domain) {
    setForm({
      name: domain.name,
      registrar: domain.registrar ?? "",
      registeredAt: toInputDate(domain.registeredAt),
      expiresAt: toInputDate(domain.expiresAt),
      autoRenew: domain.autoRenew,
      sslExpiresAt: toInputDate(domain.sslExpiresAt),
      hostingProvider: domain.hostingProvider ?? "",
      hostingExpiresAt: toInputDate(domain.hostingExpiresAt),
      notes: domain.notes ?? "",
    });
    setEditId(domain.id);
    setShowAdd(true);
    setExpandedId(null);
  }

  async function save() {
    if (!form.name || !form.expiresAt) return;
    setSaving(true);
    const payload = {
      action: editId ? "update" : "add",
      ...(editId ? { id: editId } : {}),
      ...form,
      autoRenew: Boolean(form.autoRenew),
    };
    await fetch("/api/domains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    setShowAdd(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    load();
  }

  async function deleteDomain(id: string) {
    setDeletingId(id);
    await fetch("/api/domains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    setDeletingId(null);
    if (expandedId === id) setExpandedId(null);
    load();
  }

  // Compute stats
  const now = new Date();
  const expired     = domains.filter((d) => daysUntil(d.expiresAt) < 0).length;
  const critical    = domains.filter((d) => { const n = daysUntil(d.expiresAt); return n >= 0 && n < 14; }).length;
  const warning     = domains.filter((d) => { const n = daysUntil(d.expiresAt); return n >= 14 && n < 30; }).length;
  const sslExpiring = domains.filter((d) => d.sslExpiresAt && daysUntil(d.sslExpiresAt) < 30).length;

  const filtered = domains.filter((d) => {
    if (filterStatus === "all") return true;
    const days = daysUntil(d.expiresAt);
    if (filterStatus === "expired")  return days < 0;
    if (filterStatus === "critical") return days >= 0 && days < 14;
    if (filterStatus === "warning")  return days >= 14 && days < 60;
    if (filterStatus === "ok")       return days >= 60;
    return true;
  });

  if (status === "loading" || loading) return <div style={{ padding: 24, color: "#8E8E93" }}>Loading…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Domain & Hosting</h1>
          <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 4 }}>Track renewals, SSL certs, and hosting plans</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm(EMPTY_FORM); }}
          style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          + Add Domain
        </button>
      </div>

      {/* Stats bar */}
      {domains.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Domains", value: domains.length, color: "#007AFF", bg: "#007AFF11" },
            { label: "Expired",       value: expired,        color: "#FF3B30", bg: expired > 0 ? "#FF3B3011" : "#F5F5F7" },
            { label: "Critical (14d)", value: critical,      color: "#FF3B30", bg: critical > 0 ? "#FF3B3011" : "#F5F5F7" },
            { label: "SSL Expiring",  value: sslExpiring,    color: "#FF9500", bg: sslExpiring > 0 ? "#FF950011" : "#F5F5F7" },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "16px 18px", border: `1px solid ${s.color}22` }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: "0 0 4px" }}>{s.value}</p>
              <p style={{ fontSize: 12, color: "#6E6E73", margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {domains.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {[
            { key: "all",      label: "All" },
            { key: "expired",  label: "Expired" },
            { key: "critical", label: "< 14 days" },
            { key: "warning",  label: "< 60 days" },
            { key: "ok",       label: "Safe" },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)}
              style={{ fontSize: 13, fontWeight: filterStatus === f.key ? 700 : 500, color: filterStatus === f.key ? "#fff" : "#6E6E73", background: filterStatus === f.key ? "#1D1D1F" : "#F5F5F7", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      {showAdd && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.1)", marginBottom: 24, border: "1.5px solid #007AFF33" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: "0 0 20px" }}>
            {editId ? "Edit Domain" : "Add Domain"}
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "Domain Name *", key: "name",            type: "text",  placeholder: "example.com" },
              { label: "Registrar",     key: "registrar",       type: "text",  placeholder: "Namecheap, GoDaddy…" },
              { label: "Registered On", key: "registeredAt",    type: "date",  placeholder: "" },
              { label: "Expires On *",  key: "expiresAt",       type: "date",  placeholder: "" },
              { label: "SSL Expires",   key: "sslExpiresAt",    type: "date",  placeholder: "" },
              { label: "Hosting Provider", key: "hostingProvider", type: "text", placeholder: "Vercel, Railway, Fly.io…" },
              { label: "Hosting Expires",  key: "hostingExpiresAt", type: "date", placeholder: "" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>{label}</label>
                <input type={type} placeholder={placeholder}
                  value={String(form[key as keyof FormState])}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Notes</label>
              <textarea placeholder="Renewal cost, login info, notes…" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#1D1D1F" }}>
                <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} />
                Auto-renew enabled
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={save} disabled={saving || !form.name || !form.expiresAt}
              style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: (!form.name || !form.expiresAt) ? 0.5 : 1 }}>
              {saving ? "Saving…" : editId ? "Save Changes" : "Add Domain"}
            </button>
            <button onClick={() => { setShowAdd(false); setEditId(null); setForm(EMPTY_FORM); }}
              style={{ background: "none", border: "none", color: "#8E8E93", fontSize: 14, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Domain list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", borderRadius: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌐</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F", margin: "0 0 8px" }}>
            {domains.length === 0 ? "No domains tracked yet" : "No domains in this filter"}
          </p>
          <p style={{ fontSize: 13, color: "#8E8E93" }}>
            {domains.length === 0 ? "Add your first domain to start tracking renewals." : "Try a different filter."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((domain) => {
            const days = daysUntil(domain.expiresAt);
            const u = urgency(days);
            const sslDays = domain.sslExpiresAt ? daysUntil(domain.sslExpiresAt) : null;
            const sslU = sslDays !== null ? urgency(sslDays) : null;
            const hostingDays = domain.hostingExpiresAt ? daysUntil(domain.hostingExpiresAt) : null;
            const hostingU = hostingDays !== null ? urgency(hostingDays) : null;
            const isExpanded = expandedId === domain.id;

            return (
              <div key={domain.id} style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden", border: days < 14 ? `1.5px solid ${u.color}44` : "1.5px solid transparent" }}>
                {/* Main row */}
                <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : domain.id)}>

                  {/* Status dot */}
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: u.dot, flexShrink: 0 }} />

                  {/* Domain name + registrar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>{domain.name}</span>
                      {domain.registrar && <span style={{ fontSize: 11, color: "#8E8E93" }}>{domain.registrar}</span>}
                      {domain.autoRenew && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#34C759", background: "#34C75911", borderRadius: 5, padding: "1px 6px" }}>AUTO-RENEW</span>
                      )}
                    </div>
                  </div>

                  {/* SSL pill */}
                  {sslDays !== null && sslU && (
                    <div style={{ textAlign: "center", minWidth: 72 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#8E8E93", margin: "0 0 2px", textTransform: "uppercase" }}>SSL</p>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sslU.color, background: sslU.bg, borderRadius: 6, padding: "2px 7px" }}>
                        {sslDays < 0 ? "EXPIRED" : `${sslDays}d`}
                      </span>
                    </div>
                  )}

                  {/* Hosting pill */}
                  {hostingDays !== null && hostingU && (
                    <div style={{ textAlign: "center", minWidth: 80 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#8E8E93", margin: "0 0 2px", textTransform: "uppercase" }}>Hosting</p>
                      <span style={{ fontSize: 11, fontWeight: 700, color: hostingU.color, background: hostingU.bg, borderRadius: 6, padding: "2px 7px" }}>
                        {hostingDays < 0 ? "EXPIRED" : `${hostingDays}d`}
                      </span>
                    </div>
                  )}

                  {/* Domain expiry */}
                  <div style={{ textAlign: "right", minWidth: 110 }}>
                    <p style={{ fontSize: 11, color: "#8E8E93", margin: "0 0 2px" }}>{fmt(domain.expiresAt)}</p>
                    <span style={{ fontSize: 12, fontWeight: 800, color: days < 0 ? "#fff" : u.color, background: u.bg, borderRadius: 6, padding: "2px 8px" }}>
                      {days < 0 ? "EXPIRED" : `${days}d left`}
                    </span>
                  </div>

                  {/* Chevron */}
                  <span style={{ fontSize: 12, color: "#C7C7CC", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #F5F5F7", padding: "16px 20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
                      {[
                        { label: "Registered", value: fmt(domain.registeredAt) },
                        { label: "Expires",     value: fmt(domain.expiresAt) },
                        { label: "SSL Expires", value: fmt(domain.sslExpiresAt) },
                        { label: "Hosting",     value: domain.hostingProvider || "—" },
                        { label: "Hosting Exp", value: fmt(domain.hostingExpiresAt) },
                        { label: "Auto-renew",  value: domain.autoRenew ? "Yes" : "No" },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 2px" }}>{label}</p>
                          <p style={{ fontSize: 13, color: "#1D1D1F", margin: 0 }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {domain.notes && (
                      <div style={{ background: "#F5F5F7", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                        <p style={{ fontSize: 13, color: "#3C3C43", margin: 0 }}>{domain.notes}</p>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => startEdit(domain)}
                        style={{ background: "#F5F5F7", color: "#1D1D1F", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        Edit
                      </button>
                      <button onClick={() => deleteDomain(domain.id)} disabled={deletingId === domain.id}
                        style={{ background: "transparent", color: "#FF3B30", border: "1.5px solid #FF3B3033", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        {deletingId === domain.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Renewal tips */}
      {(expired > 0 || critical > 0) && (
        <div style={{ marginTop: 24, background: "#FF3B3008", border: "1.5px solid #FF3B3033", borderRadius: 14, padding: "16px 20px" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#FF3B30", margin: "0 0 6px" }}>⚠️ Action Required</p>
          {expired > 0 && <p style={{ fontSize: 13, color: "#1D1D1F", margin: "0 0 4px" }}>• <strong>{expired}</strong> domain{expired > 1 ? "s" : ""} already expired — renew immediately to avoid losing the domain.</p>}
          {critical > 0 && <p style={{ fontSize: 13, color: "#1D1D1F", margin: 0 }}>• <strong>{critical}</strong> domain{critical > 1 ? "s" : ""} expire within 14 days — log into your registrar and renew now.</p>}
        </div>
      )}
    </div>
  );
}
