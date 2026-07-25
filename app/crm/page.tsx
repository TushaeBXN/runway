"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Interaction { id: string; type: string; summary: string; amount?: number | null; occurredAt: string; }
interface Contact {
  id: string; type: string; firstName: string; lastName: string;
  email?: string | null; phone?: string | null; org?: string | null;
  tags?: string | null; notes?: string | null; totalDonated: number;
  lastContact?: string | null; interactions: Interaction[];
}
interface StatRow { type: string; _count: number; _sum: { totalDonated: number | null }; }

const TYPE_COLORS: Record<string, { color: string; bg: string; emoji: string }> = {
  donor:     { color: "#FF2D55", bg: "#FF2D5511", emoji: "💛" },
  volunteer: { color: "#34C759", bg: "#34C75911", emoji: "🙌" },
  partner:   { color: "#007AFF", bg: "#007AFF11", emoji: "🤝" },
  vendor:    { color: "#5856D6", bg: "#5856D611", emoji: "📦" },
  board:     { color: "#FF9500", bg: "#FF950011", emoji: "🏛" },
};
const INTERACTION_ICONS: Record<string, string> = {
  email: "✉", call: "📞", meeting: "📅", donation: "💰", note: "📝",
};

const EMPTY = { type: "donor", firstName: "", lastName: "", email: "", phone: "", org: "", tags: "", notes: "" };
const EMPTY_INT = { type: "note", summary: "", amount: "", occurredAt: new Date().toISOString().split("T")[0] };

export default function CRMPage() {
  const { status } = useSession();
  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showInt, setShowInt] = useState(false);
  const [intForm, setIntForm] = useState(EMPTY_INT);
  const [savingInt, setSavingInt] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") load();
  }, [status]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/crm?${params}`);
    const d = await res.json();
    setContacts(d.contacts ?? []);
    setStats(d.stats ?? []);
    setLoading(false);
  }, [typeFilter, search]);

  useEffect(() => { if (status === "authenticated") load(); }, [typeFilter, search, load, status]);

  async function save() {
    setSaving(true);
    const action = editId ? "update_contact" : "add_contact";
    await fetch("/api/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(editId ? { id: editId } : {}), ...form }) });
    setSaving(false); setShowAdd(false); setEditId(null); setForm(EMPTY); load();
  }

  async function addInteraction() {
    if (!selectedId) return;
    setSavingInt(true);
    await fetch("/api/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_interaction", contactId: selectedId, ...intForm }) });
    setSavingInt(false); setShowInt(false); setIntForm(EMPTY_INT); load();
  }

  async function deleteContact(id: string) {
    setDeleting(id);
    await fetch("/api/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_contact", id }) });
    setDeleting(null); if (selectedId === id) setSelectedId(null); load();
  }

  const selected = contacts.find((c) => c.id === selectedId) ?? null;
  const totalDonors = stats.reduce((s, r) => s + r._count, 0);
  const totalRaised = stats.reduce((s, r) => s + (r._sum.totalDonated ?? 0), 0);

  if (status === "loading" || loading) return <div style={{ padding: 24, color: "#8E8E93" }}>Loading…</div>;

  return (
    <div style={{ display: "flex", height: "calc(100vh - var(--nav-height) - 24px)", margin: "-24px -24px 0", overflow: "hidden", background: "#F5F5F7" }}>
      {/* Left panel */}
      <div style={{ width: 300, background: "#1D1D1F", display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 12px" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>CRM</p>
          <p style={{ fontSize: 11, color: "#636366" }}>{totalDonors} contacts · ${totalRaised.toLocaleString()} raised</p>
        </div>

        <div style={{ padding: "0 12px 12px" }}>
          <input placeholder="Search contacts…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 9, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ padding: "0 8px 8px" }}>
          {[{ key: "", label: "All" }, ...Object.entries(TYPE_COLORS).map(([k, v]) => ({ key: k, label: `${v.emoji} ${k.charAt(0).toUpperCase() + k.slice(1)}` }))].map((f) => {
            const count = f.key ? (stats.find((s) => s.type === f.key)?._count ?? 0) : totalDonors;
            return (
              <button key={f.key} onClick={() => setTypeFilter(f.key)}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", border: "none", borderRadius: 7, background: typeFilter === f.key ? "rgba(255,255,255,0.1)" : "transparent", color: typeFilter === f.key ? "#fff" : "#8E8E93", fontSize: 13, cursor: "pointer" }}>
                <span>{f.label}</span>
                <span style={{ fontSize: 11, color: "#636366" }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ padding: "12px" }}>
          <button onClick={() => { setShowAdd(true); setEditId(null); setForm(EMPTY); }}
            style={{ width: "100%", background: "#007AFF", color: "#fff", border: "none", borderRadius: 9, padding: "9px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + Add Contact
          </button>
        </div>
      </div>

      {/* Contact list */}
      <div style={{ width: 280, background: "#fff", borderRight: "1px solid #E5E5EA", overflowY: "auto", flexShrink: 0 }}>
        {contacts.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>👥</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F" }}>No contacts yet</p>
            <p style={{ fontSize: 12, color: "#8E8E93" }}>Add your first contact to get started.</p>
          </div>
        ) : contacts.map((c) => {
          const tc = TYPE_COLORS[c.type] ?? TYPE_COLORS.donor;
          return (
            <div key={c.id} onClick={() => { setSelectedId(c.id); setShowAdd(false); }}
              style={{ padding: "12px 14px", borderBottom: "1px solid #F5F5F7", cursor: "pointer", background: selectedId === c.id ? "#F0F4FF" : "#fff", borderLeft: selectedId === c.id ? `3px solid ${tc.color}` : "3px solid transparent" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{tc.emoji}</div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.firstName} {c.lastName}</p>
                  <p style={{ fontSize: 11, color: "#8E8E93", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.org || c.email || c.type}</p>
                </div>
                {c.totalDonated > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: tc.color, marginLeft: "auto", flexShrink: 0 }}>${c.totalDonated.toLocaleString()}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail / Add form */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {showAdd ? (
          <div style={{ maxWidth: 560 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: "0 0 20px" }}>{editId ? "Edit Contact" : "New Contact"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none" }}>
                  {Object.entries(TYPE_COLORS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
                </select>
              </div>
              {[
                { label: "First Name *", key: "firstName" }, { label: "Last Name *", key: "lastName" },
                { label: "Email", key: "email" }, { label: "Phone", key: "phone" },
                { label: "Organization", key: "org" }, { label: "Tags (comma-separated)", key: "tags" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>{label}</label>
                  <input value={String(form[key as keyof typeof form])} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
                  style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={save} disabled={saving || !form.firstName || !form.lastName}
                style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Saving…" : editId ? "Save Changes" : "Add Contact"}
              </button>
              <button onClick={() => { setShowAdd(false); setEditId(null); }} style={{ background: "none", border: "none", color: "#8E8E93", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : selected ? (
          <div style={{ maxWidth: 620 }}>
            {/* Contact header */}
            {(() => {
              const tc = TYPE_COLORS[selected.type] ?? TYPE_COLORS.donor;
              return (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>{tc.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F", margin: "0 0 4px" }}>{selected.firstName} {selected.lastName}</h2>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: tc.color, background: tc.bg, borderRadius: 6, padding: "2px 8px" }}>{selected.type.toUpperCase()}</span>
                      {selected.org && <span style={{ fontSize: 12, color: "#8E8E93" }}>@ {selected.org}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setForm({ type: selected.type, firstName: selected.firstName, lastName: selected.lastName, email: selected.email ?? "", phone: selected.phone ?? "", org: selected.org ?? "", tags: selected.tags ?? "", notes: selected.notes ?? "" }); setEditId(selected.id); setShowAdd(true); }}
                      style={{ background: "#F5F5F7", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#1D1D1F" }}>Edit</button>
                    <button onClick={() => deleteContact(selected.id)} disabled={deleting === selected.id}
                      style={{ background: "transparent", border: "1.5px solid #FF3B3033", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#FF3B30" }}>
                      {deleting === selected.id ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Info grid */}
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Email",        value: selected.email },
                { label: "Phone",        value: selected.phone },
                { label: "Total Donated", value: selected.totalDonated > 0 ? `$${selected.totalDonated.toLocaleString()}` : "—" },
                { label: "Last Contact", value: selected.lastContact ? new Date(selected.lastContact).toLocaleDateString() : "Never" },
                { label: "Tags",         value: selected.tags },
              ].map(({ label, value }) => value ? (
                <div key={label}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 2px" }}>{label}</p>
                  <p style={{ fontSize: 14, color: "#1D1D1F", margin: 0 }}>{value}</p>
                </div>
              ) : null)}
              {selected.notes && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 2px" }}>Notes</p>
                  <p style={{ fontSize: 14, color: "#3C3C43", margin: 0, fontStyle: "italic" }}>{selected.notes}</p>
                </div>
              )}
            </div>

            {/* Interaction log */}
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Interactions</h3>
                <button onClick={() => setShowInt(!showInt)}
                  style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  + Log
                </button>
              </div>

              {showInt && (
                <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "14px", marginBottom: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Type</label>
                      <select value={intForm.type} onChange={(e) => setIntForm({ ...intForm, type: e.target.value })}
                        style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none" }}>
                        {["email", "call", "meeting", "donation", "note"].map((t) => <option key={t} value={t}>{INTERACTION_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Date</label>
                      <input type="date" value={intForm.occurredAt} onChange={(e) => setIntForm({ ...intForm, occurredAt: e.target.value })}
                        style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    {intForm.type === "donation" && (
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Amount ($)</label>
                        <input type="number" placeholder="0" value={intForm.amount} onChange={(e) => setIntForm({ ...intForm, amount: e.target.value })}
                          style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                      </div>
                    )}
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Summary</label>
                      <input value={intForm.summary} onChange={(e) => setIntForm({ ...intForm, summary: e.target.value })} placeholder="What happened?"
                        style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <button onClick={addInteraction} disabled={savingInt || !intForm.summary}
                    style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {savingInt ? "Saving…" : "Log Interaction"}
                  </button>
                </div>
              )}

              {selected.interactions.length === 0 ? (
                <p style={{ fontSize: 13, color: "#8E8E93", textAlign: "center", padding: "16px 0" }}>No interactions logged yet.</p>
              ) : selected.interactions.map((i) => (
                <div key={i.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #F5F5F7" }}>
                  <span style={{ fontSize: 18 }}>{INTERACTION_ICONS[i.type] ?? "📝"}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: "#1D1D1F", margin: "0 0 2px" }}>{i.summary}{i.amount ? ` — $${i.amount.toLocaleString()}` : ""}</p>
                    <p style={{ fontSize: 11, color: "#8E8E93", margin: 0 }}>{new Date(i.occurredAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#8E8E93" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>👥</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F" }}>Select a contact</p>
            <p style={{ fontSize: 13 }}>Click any contact to view their profile and interaction history.</p>
          </div>
        )}
      </div>
    </div>
  );
}
