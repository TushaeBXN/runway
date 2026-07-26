"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface GrantApplication {
  id: string; funder: string; title: string; amount: string; deadline?: string | null;
  status: string; draftContent?: string | null; notes?: string | null;
  opportunityId?: string | null; createdAt: string; updatedAt: string;
}
interface GrantOpportunity { id: string; title: string; funder: string; amount: string; deadline: string; hook: string; }
interface CountRow { status: string; _count: number; }

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  drafting:    { color: "#8E8E93", bg: "#F5F5F7",      label: "Drafting" },
  in_review:   { color: "#FF9500", bg: "#FF950011",    label: "In Review" },
  submitted:   { color: "#007AFF", bg: "#007AFF11",    label: "Submitted" },
  awarded:     { color: "#34C759", bg: "#34C75911",    label: "Awarded 🏆" },
  rejected:    { color: "#FF3B30", bg: "#FF3B3011",    label: "Rejected" },
};

const EMPTY = { funder: "", title: "", amount: "", deadline: "", notes: "", opportunityId: "" };

export default function GrantWriterPage() {
  const { status } = useSession();
  const router = useRouter();

  const [apps, setApps] = useState<GrantApplication[]>([]);
  const [opportunities, setOpportunities] = useState<GrantOpportunity[]>([]);
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [aiDrafting, setAiDrafting] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [pickOpp, setPickOpp] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") load();
  }, [status]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/grant-writer");
    const d = await res.json();
    setApps(d.applications ?? []);
    setOpportunities(d.opportunities ?? []);
    setCounts(d.statusCounts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (status === "authenticated") load(); }, [load, status]);

  async function create() {
    setSaving(true);
    await fetch("/api/grant-writer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...form }) });
    setSaving(false); setShowCreate(false); setForm(EMPTY); setPickOpp(false); load();
  }

  async function aiDraft(id: string) {
    setAiDrafting(id);
    const res = await fetch("/api/grant-writer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ai_draft", id }) });
    const d = await res.json();
    if (d.ok) { setApps((prev) => prev.map((a) => a.id === id ? d.app : a)); setSelectedId(id); }
    setAiDrafting(null);
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    await fetch("/api/grant-writer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", id, draftContent: editContent }) });
    setSavingEdit(false); setEditing(false); load();
  }

  async function updateStatus(id: string, newStatus: string) {
    await fetch("/api/grant-writer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", id, status: newStatus, ...(newStatus === "submitted" ? { submittedAt: new Date().toISOString() } : {}) }) });
    load();
  }

  async function deleteApp(id: string) {
    setDeleting(id);
    await fetch("/api/grant-writer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    setDeleting(null); if (selectedId === id) setSelectedId(null); load();
  }

  const selected = apps.find((a) => a.id === selectedId) ?? null;
  const totalApps = counts.reduce((s, c) => s + c._count, 0);
  const awarded = counts.find((c) => c.status === "awarded")?._count ?? 0;
  const submitted = counts.find((c) => c.status === "submitted")?._count ?? 0;
  const filtered = filterStatus ? apps.filter((a) => a.status === filterStatus) : apps;

  if (status === "loading" || loading) return <div style={{ padding: 24, color: "#8E8E93" }}>Loading…</div>;

  return (
    <div style={{ display: "flex", height: "calc(100vh - var(--nav-height) - 24px)", margin: "-24px 0 0", overflow: "hidden", background: "#F5F5F7" }}>
      {/* Sidebar */}
      <div style={{ width: 270, background: "#1D1D1F", display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 12px" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>Grant Writer</p>
          <p style={{ fontSize: 11, color: "#636366" }}>{totalApps} applications · {awarded} awarded</p>
        </div>

        <div style={{ padding: "0 8px 8px" }}>
          {[
            { key: "", label: "All" },
            ...Object.entries(STATUS_META).map(([k, v]) => ({ key: k, label: v.label })),
          ].map((f) => {
            const count = f.key ? (counts.find((c) => c.status === f.key)?._count ?? 0) : totalApps;
            return (
              <button key={f.key} onClick={() => setFilterStatus(f.key)}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", border: "none", borderRadius: 7, background: filterStatus === f.key ? "rgba(255,255,255,0.1)" : "transparent", color: filterStatus === f.key ? "#fff" : "#8E8E93", fontSize: 13, cursor: "pointer" }}>
                <span>{f.label}</span>
                {count > 0 && <span style={{ fontSize: 11, color: "#636366" }}>{count}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ padding: "12px" }}>
          <button onClick={() => { setShowCreate(true); setSelectedId(null); setForm(EMPTY); }}
            style={{ width: "100%", background: "#007AFF", color: "#fff", border: "none", borderRadius: 9, padding: "9px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + New Application
          </button>
        </div>
      </div>

      {/* Application list */}
      <div style={{ width: 290, background: "#fff", borderRight: "1px solid #E5E5EA", overflowY: "auto", flexShrink: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>📝</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F" }}>No applications</p>
            <p style={{ fontSize: 12, color: "#8E8E93" }}>Start a new grant application.</p>
          </div>
        ) : filtered.map((app) => {
          const sm = STATUS_META[app.status] ?? STATUS_META.drafting;
          return (
            <div key={app.id} onClick={() => { setSelectedId(app.id); setShowCreate(false); setEditing(false); }}
              style={{ padding: "12px 14px", borderBottom: "1px solid #F5F5F7", cursor: "pointer", background: selectedId === app.id ? "#F0F4FF" : "#fff", borderLeft: selectedId === app.id ? "3px solid #007AFF" : "3px solid transparent" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg, borderRadius: 5, padding: "1px 6px" }}>{sm.label.toUpperCase()}</span>
                {app.amount && <span style={{ fontSize: 11, color: "#34C759", fontWeight: 700 }}>{app.amount}</span>}
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.title}</p>
              <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>{app.funder}{app.deadline ? ` · Due ${new Date(app.deadline).toLocaleDateString()}` : ""}</p>
            </div>
          );
        })}
      </div>

      {/* Detail / Create */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {showCreate ? (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: "0 0 6px" }}>New Grant Application</h3>
            <p style={{ fontSize: 13, color: "#8E8E93", margin: "0 0 20px" }}>Fill in the details and let AI write the full narrative.</p>

            {/* Import from opportunity */}
            <div style={{ background: "#F0F4FF", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#007AFF", margin: "0 0 8px" }}>📥 Import from Scouted Opportunity</p>
              <select value={form.opportunityId} onChange={(e) => {
                const opp = opportunities.find((o) => o.id === e.target.value);
                if (opp) setForm({ ...form, opportunityId: opp.id, funder: opp.funder, title: opp.title, amount: opp.amount, deadline: opp.deadline?.split("T")[0] ?? "" });
                else setForm({ ...form, opportunityId: "" });
              }}
                style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }}>
                <option value="">— Start from scratch —</option>
                {opportunities.map((o) => <option key={o.id} value={o.id}>{o.funder} · {o.title} · {o.amount}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "Funder / Foundation *", key: "funder", placeholder: "Ford Foundation" },
                { label: "Grant Title *", key: "title", placeholder: "Community Health Initiative" },
                { label: "Amount", key: "amount", placeholder: "$50,000" },
                { label: "Deadline", key: "deadline", placeholder: "", type: "date" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>{label}</label>
                  <input type={type || "text"} placeholder={placeholder} value={String(form[key as keyof typeof form])}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Internal notes, strategy, contacts…"
                  style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={create} disabled={saving || !form.funder || !form.title}
                style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (!form.funder || !form.title) ? 0.5 : 1 }}>
                {saving ? "Creating…" : "Create Application"}
              </button>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", color: "#8E8E93", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : selected ? (() => {
          const sm = STATUS_META[selected.status] ?? STATUS_META.drafting;
          return (
            <div style={{ maxWidth: 700 }}>
              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1D1D1F", margin: "0 0 6px" }}>{selected.title}</h2>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: sm.color, background: sm.bg, borderRadius: 6, padding: "2px 8px" }}>{sm.label}</span>
                      <span style={{ fontSize: 13, color: "#8E8E93" }}>{selected.funder}</span>
                      {selected.amount && <span style={{ fontSize: 13, fontWeight: 700, color: "#34C759" }}>{selected.amount}</span>}
                      {selected.deadline && <span style={{ fontSize: 12, color: "#FF9500" }}>Due {new Date(selected.deadline).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>

                {selected.notes && (
                  <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 14px" }}>
                    <p style={{ fontSize: 13, color: "#3C3C43", margin: 0 }}>{selected.notes}</p>
                  </div>
                )}
              </div>

              {/* Draft content */}
              {!selected.draftContent ? (
                <div style={{ background: "#fff", borderRadius: 14, padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", textAlign: "center", marginBottom: 14 }}>
                  <p style={{ fontSize: 36, marginBottom: 12 }}>✍️</p>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F", margin: "0 0 8px" }}>No draft yet</p>
                  <p style={{ fontSize: 13, color: "#8E8E93", margin: "0 0 20px" }}>Click below to have AI write the full grant narrative based on your org profile.</p>
                  <button onClick={() => aiDraft(selected.id)} disabled={aiDrafting === selected.id}
                    style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    {aiDrafting === selected.id ? "Writing (may take 30s)…" : "✨ Generate AI Draft"}
                  </button>
                </div>
              ) : editing ? (
                <div style={{ marginBottom: 14 }}>
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={30}
                    style={{ width: "100%", border: "1.5px solid #007AFF", borderRadius: 14, padding: "16px 20px", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.7 }} />
                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button onClick={() => saveEdit(selected.id)} disabled={savingEdit}
                      style={{ background: "#34C759", color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      {savingEdit ? "Saving…" : "Save Draft"}
                    </button>
                    <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", color: "#8E8E93", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginBottom: 14, whiteSpace: "pre-wrap", fontSize: 14, color: "#1D1D1F", lineHeight: 1.8 }}>
                  {selected.draftContent}
                </div>
              )}

              {/* Actions */}
              {!editing && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {selected.draftContent && (
                    <button onClick={() => { setEditing(true); setEditContent(selected.draftContent ?? ""); }}
                      style={{ background: "#F5F5F7", color: "#1D1D1F", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      ✏ Edit Draft
                    </button>
                  )}
                  {selected.draftContent && selected.status !== "submitted" && selected.status !== "awarded" && (
                    <button onClick={() => aiDraft(selected.id)} disabled={aiDrafting === selected.id}
                      style={{ background: "#007AFF11", color: "#007AFF", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      {aiDrafting === selected.id ? "Rewriting…" : "✨ Redraft with AI"}
                    </button>
                  )}
                  {selected.status === "in_review" && (
                    <button onClick={() => updateStatus(selected.id, "submitted")}
                      style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      Mark Submitted
                    </button>
                  )}
                  {selected.status === "submitted" && (
                    <>
                      <button onClick={() => updateStatus(selected.id, "awarded")}
                        style={{ background: "#34C759", color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        🏆 Mark Awarded
                      </button>
                      <button onClick={() => updateStatus(selected.id, "rejected")}
                        style={{ background: "transparent", color: "#FF3B30", border: "1.5px solid #FF3B3033", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        Mark Rejected
                      </button>
                    </>
                  )}
                  <button onClick={() => deleteApp(selected.id)} disabled={deleting === selected.id}
                    style={{ background: "transparent", color: "#FF3B30", border: "1.5px solid #FF3B3033", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginLeft: "auto" }}>
                    {deleting === selected.id ? "…" : "Delete"}
                  </button>
                </div>
              )}
            </div>
          );
        })() : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#8E8E93" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📝</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F" }}>Select an application</p>
            <p style={{ fontSize: 13 }}>Or start a new grant application with AI-generated narrative.</p>
          </div>
        )}
      </div>
    </div>
  );
}
