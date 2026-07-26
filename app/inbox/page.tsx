"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface IngestedEmail {
  id: string; accountId: string; uid: number; subject: string;
  fromEmail: string; fromName?: string; receivedAt: string;
  body: string; category: string; priority: string; status: string;
  agentRoute?: string; draftId?: string; summary?: string; notes?: string;
}

interface CountRow { status: string; _count: number; }
interface CatCount { category: string; _count: number; }

const CATEGORY_ICONS: Record<string, string> = {
  grant: "🏆", donor: "💛", support: "🎧", vendor: "📦", compliance: "🏛", other: "📬",
};
const CATEGORY_COLORS: Record<string, string> = {
  grant: "#FF9500", donor: "#FF2D55", support: "#007AFF", vendor: "#5856D6", compliance: "#FF3B30", other: "#8E8E93",
};
const PRIORITY_COLOR: Record<string, string> = { urgent: "#FF3B30", normal: "#1D1D1F", low: "#8E8E93" };
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", in_review: "In Review", replied: "Replied", archived: "Archived",
};

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontSize: 10, fontWeight: 800, color, background: bg, borderRadius: 6, padding: "2px 7px", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>;
}

export default function InboxPage() {
  const { status } = useSession();
  const router = useRouter();

  const [emails, setEmails] = useState<IngestedEmail[]>([]);
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [catCounts, setCatCounts] = useState<CatCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ totalFetched: number; totalStored: number } | null>(null);

  const [filterStatus, setFilterStatus] = useState("pending");
  const [filterCategory, setFilterCategory] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sendDraft, setSendDraft] = useState<{ to: string; subject: string; body: string } | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") load();
  }, [status]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (filterStatus) params.set("status", filterStatus);
    if (filterCategory) params.set("category", filterCategory);
    const res = await fetch(`/api/email?${params}`);
    const d = await res.json();
    setEmails(d.emails ?? []);
    setCounts(d.counts ?? []);
    setCatCounts(d.categoryCounts ?? []);
    setLoading(false);
  }, [filterStatus, filterCategory]);

  useEffect(() => { if (status === "authenticated") load(); }, [filterStatus, filterCategory, load, status]);

  async function sync() {
    setSyncing(true); setSyncResult(null);
    const res = await fetch("/api/email/sync", { method: "POST" });
    const d = await res.json();
    if (d.ok) setSyncResult({ totalFetched: d.totalFetched, totalStored: d.totalStored });
    setSyncing(false);
    load();
  }

  async function draftReply(emailId: string) {
    setDrafting(emailId);
    const res = await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "draft_reply", id: emailId }) });
    const d = await res.json();
    if (d.ok) { alert("Draft created! Check the Approvals queue or Team channel."); load(); }
    else alert(`Draft failed: ${d.error}`);
    setDrafting(null);
  }

  async function sendEmailNow() {
    if (!sendDraft || !selectedId) return;
    setSending(selectedId);
    const res = await fetch("/api/email/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailId: selectedId, ...sendDraft }) });
    const d = await res.json();
    if (d.ok) { setSendDraft(null); load(); }
    else alert(`Send failed: ${d.error}`);
    setSending(null);
  }

  async function archive(emailId: string) {
    setArchiving(emailId);
    await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_status", id: emailId, status: "archived" }) });
    setArchiving(null);
    if (selectedId === emailId) setSelectedId(null);
    load();
  }

  async function saveNote(emailId: string) {
    setSavingNote(true);
    await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_note", id: emailId, notes: note }) });
    setSavingNote(false);
    load();
  }

  const selected = emails.find((e) => e.id === selectedId) ?? null;
  const pendingCount = counts.find((c) => c.status === "pending")?._count ?? 0;
  const totalActive = counts.filter((c) => c.status !== "archived").reduce((s, c) => s + c._count, 0);

  if (status === "loading" || loading) return <div style={{ padding: 24, color: "#8E8E93" }}>Loading…</div>;

  return (
    <div style={{ display: "flex", height: "calc(100vh - var(--nav-height) - 24px)", margin: "-24px 0 0", background: "#F5F5F7", overflow: "hidden" }}>

      {/* Left sidebar */}
      <div style={{ width: 260, background: "#1D1D1F", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
        <div style={{ padding: "20px 16px 12px" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Inbox</p>
          <p style={{ fontSize: 11, color: "#636366", marginTop: 2 }}>{totalActive} email{totalActive !== 1 ? "s" : ""} active</p>
        </div>

        {/* Sync button */}
        <div style={{ padding: "0 12px 12px" }}>
          <button onClick={sync} disabled={syncing}
            style={{ width: "100%", background: syncing ? "#2C2C2E" : "#007AFF", color: "#fff", border: "none", borderRadius: 9, padding: "9px", fontSize: 13, fontWeight: 700, cursor: syncing ? "wait" : "pointer" }}>
            {syncing ? "Syncing…" : "↓ Sync Inbox"}
          </button>
          {syncResult && (
            <p style={{ fontSize: 11, color: "#34C759", textAlign: "center", marginTop: 6 }}>
              ✓ {syncResult.totalStored} new · {syncResult.totalFetched} fetched
            </p>
          )}
        </div>

        {/* Status filters */}
        <div style={{ padding: "0 8px 8px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#636366", textTransform: "uppercase", letterSpacing: 0.8, padding: "4px 8px 2px" }}>Status</p>
          {[
            { key: "pending", label: "Pending" },
            { key: "in_review", label: "In Review" },
            { key: "replied", label: "Replied" },
            { key: "", label: "All" },
          ].map((f) => {
            const count = f.key ? (counts.find((c) => c.status === f.key)?._count ?? 0) : totalActive;
            return (
              <button key={f.key} onClick={() => { setFilterStatus(f.key); setSelectedId(null); }}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", border: "none", borderRadius: 7, background: filterStatus === f.key ? "rgba(255,255,255,0.1)" : "transparent", color: filterStatus === f.key ? "#fff" : "#8E8E93", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                <span>{f.label}</span>
                {count > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: f.key === "pending" && pendingCount > 0 ? "#FF3B30" : "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 10, padding: "1px 7px" }}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Category filters */}
        {catCounts.length > 0 && (
          <div style={{ padding: "0 8px 8px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#636366", textTransform: "uppercase", letterSpacing: 0.8, padding: "8px 8px 2px" }}>Categories</p>
            <button onClick={() => setFilterCategory("")}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", border: "none", borderRadius: 7, background: !filterCategory ? "rgba(255,255,255,0.1)" : "transparent", color: !filterCategory ? "#fff" : "#8E8E93", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
              All categories
            </button>
            {catCounts.map((c) => (
              <button key={c.category} onClick={() => setFilterCategory(c.category === filterCategory ? "" : c.category)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px", border: "none", borderRadius: 7, background: filterCategory === c.category ? "rgba(255,255,255,0.1)" : "transparent", color: filterCategory === c.category ? "#fff" : "#8E8E93", fontSize: 13, cursor: "pointer" }}>
                <span>{CATEGORY_ICONS[c.category]} {c.category.charAt(0).toUpperCase() + c.category.slice(1)}</span>
                <span style={{ fontSize: 11, color: "#636366" }}>{c._count}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <a href="/compliance" style={{ fontSize: 11, color: "#636366", textDecoration: "none" }}>Manage email accounts →</a>
        </div>
      </div>

      {/* Email list */}
      <div style={{ width: 320, background: "#fff", borderRight: "1px solid #E5E5EA", overflowY: "auto", flexShrink: 0 }}>
        {emails.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: "0 0 6px" }}>
              {filterStatus === "pending" ? "Inbox is clear" : "Nothing here"}
            </p>
            <p style={{ fontSize: 12, color: "#8E8E93" }}>
              {filterStatus === "pending" ? "Click Sync Inbox to check for new emails." : "No emails in this filter."}
            </p>
          </div>
        ) : (
          emails.map((email) => {
            const isSelected = selectedId === email.id;
            const catColor = CATEGORY_COLORS[email.category] ?? "#8E8E93";
            return (
              <div key={email.id} onClick={() => { setSelectedId(email.id); setNote(email.notes ?? ""); setSendDraft(null); }}
                style={{ padding: "12px 14px", borderBottom: "1px solid #F5F5F7", cursor: "pointer", background: isSelected ? "#F0F4FF" : "#fff", borderLeft: isSelected ? `3px solid ${catColor}` : "3px solid transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 13 }}>{CATEGORY_ICONS[email.category]}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: catColor }}>{email.category.toUpperCase()}</span>
                  {email.priority === "urgent" && <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: "#FF3B30", borderRadius: 5, padding: "1px 5px" }}>URGENT</span>}
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 10, color: "#8E8E93" }}>{new Date(email.receivedAt).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: PRIORITY_COLOR[email.priority] ?? "#1D1D1F", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email.subject}</p>
                <p style={{ fontSize: 11, color: "#8E8E93", margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email.fromEmail}</p>
                {email.summary && <p style={{ fontSize: 11, color: "#6E6E73", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email.summary}</p>}
              </div>
            );
          })
        )}
      </div>

      {/* Email detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {!selected ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#8E8E93" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F" }}>Select an email</p>
            <p style={{ fontSize: 13 }}>Click any email on the left to read it</p>
          </div>
        ) : (
          <div style={{ maxWidth: 680 }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1D1D1F", margin: "0 0 6px", lineHeight: 1.3 }}>{selected.subject}</h2>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Badge label={selected.category} color={CATEGORY_COLORS[selected.category]} bg={CATEGORY_COLORS[selected.category] + "22"} />
                    {selected.priority === "urgent" && <Badge label="URGENT" color="#FF3B30" bg="#FF3B3011" />}
                    <Badge label={STATUS_LABELS[selected.status] ?? selected.status} color="#8E8E93" bg="#F5F5F7" />
                  </div>
                </div>
              </div>

              <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", minWidth: 48 }}>FROM</span>
                  <span style={{ fontSize: 13, color: "#1D1D1F" }}>{selected.fromEmail}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", minWidth: 48 }}>DATE</span>
                  <span style={{ fontSize: 13, color: "#1D1D1F" }}>{new Date(selected.receivedAt).toLocaleString()}</span>
                </div>
                {selected.agentRoute && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", minWidth: 48 }}>ROUTE</span>
                    <span style={{ fontSize: 13, color: "#007AFF" }}>{selected.agentRoute}</span>
                  </div>
                )}
              </div>

              {selected.summary && (
                <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", marginTop: 10, borderLeft: "3px solid #007AFF" }}>
                  <p style={{ fontSize: 13, color: "#1D1D1F", margin: 0, fontStyle: "italic" }}>AI Summary: {selected.summary}</p>
                </div>
              )}
            </div>

            {/* Body */}
            <div style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginBottom: 16, whiteSpace: "pre-wrap", fontSize: 14, color: "#1D1D1F", lineHeight: 1.7 }}>
              {selected.body}
            </div>

            {/* Send draft form */}
            {sendDraft && (
              <div style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginBottom: 16, border: "2px solid #007AFF" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: "0 0 14px" }}>Send Reply</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "TO", key: "to" as const },
                    { label: "SUBJECT", key: "subject" as const },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", minWidth: 60 }}>{label}</span>
                      <input value={sendDraft[key]} onChange={(e) => setSendDraft({ ...sendDraft, [key]: e.target.value })}
                        style={{ flex: 1, border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none" }} />
                    </div>
                  ))}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", margin: "0 0 4px" }}>BODY</p>
                    <textarea value={sendDraft.body} onChange={(e) => setSendDraft({ ...sendDraft, body: e.target.value })}
                      rows={8} style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={sendEmailNow} disabled={sending === selected.id}
                      style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      {sending === selected.id ? "Sending…" : "Send Email"}
                    </button>
                    <button onClick={() => setSendDraft(null)} style={{ background: "none", border: "none", color: "#8E8E93", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Action bar */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              {selected.status !== "replied" && !sendDraft && (
                <>
                  <button onClick={() => draftReply(selected.id)} disabled={drafting === selected.id}
                    style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {drafting === selected.id ? "Drafting…" : "✍ AI Draft Reply"}
                  </button>
                  <button onClick={() => setSendDraft({ to: selected.fromEmail, subject: `Re: ${selected.subject}`, body: "" })}
                    style={{ background: "#34C759", color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ✉ Write Reply
                  </button>
                </>
              )}
              {selected.status !== "archived" && (
                <button onClick={() => archive(selected.id)} disabled={archiving === selected.id}
                  style={{ background: "transparent", color: "#8E8E93", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {archiving === selected.id ? "…" : "Archive"}
                </button>
              )}
            </div>

            {/* Notes */}
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 8px" }}>Notes</p>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add internal notes about this email…" rows={3}
                style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              <button onClick={() => saveNote(selected.id)} disabled={savingNote}
                style={{ marginTop: 8, background: "#F5F5F7", color: "#1D1D1F", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {savingNote ? "Saving…" : "Save Note"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
