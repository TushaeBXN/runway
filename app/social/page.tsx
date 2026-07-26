"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ScheduledPost {
  id: string; platform: string; content: string; imageUrl?: string | null;
  scheduledFor?: string | null; status: string; approvalId?: string | null;
  postedAt?: string | null; notes?: string | null; createdAt: string;
}
interface CountRow { status: string; _count: number; }

const PLATFORM_META: Record<string, { emoji: string; color: string; limit: number }> = {
  twitter:   { emoji: "𝕏",  color: "#000",    limit: 280 },
  linkedin:  { emoji: "in", color: "#0A66C2", limit: 3000 },
  facebook:  { emoji: "f",  color: "#1877F2", limit: 63206 },
  instagram: { emoji: "📷", color: "#E1306C", limit: 2200 },
};
const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  draft:      { color: "#8E8E93", bg: "#F5F5F7" },
  in_review:  { color: "#FF9500", bg: "#FF950011" },
  approved:   { color: "#34C759", bg: "#34C75911" },
  scheduled:  { color: "#007AFF", bg: "#007AFF11" },
  posted:     { color: "#5856D6", bg: "#5856D611" },
  failed:     { color: "#FF3B30", bg: "#FF3B3011" },
};

export default function SocialPage() {
  const { status } = useSession();
  const router = useRouter();

  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [platform, setPlatform] = useState("twitter");
  const [content, setContent] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState("warm and inspiring");
  const [aiLoading, setAiLoading] = useState(false);

  const [submitting, setSubmitting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") load();
  }, [status]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    const res = await fetch(`/api/social?${params}`);
    const d = await res.json();
    setPosts(d.posts ?? []);
    setCounts(d.counts ?? []);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { if (status === "authenticated") load(); }, [filterStatus, load, status]);

  async function aiDraft() {
    if (!aiTopic) return;
    setAiLoading(true);
    const res = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ai_draft", platform, topic: aiTopic, tone: aiTone }) });
    const d = await res.json();
    if (d.ok) setContent(d.content);
    setAiLoading(false);
  }

  async function createPost() {
    if (!content) return;
    setSaving(true);
    await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", platform, content, scheduledFor: scheduledFor || null, notes }) });
    setSaving(false); setShowCreate(false); setContent(""); setAiTopic(""); setScheduledFor(""); setNotes(""); load();
  }

  async function submitForApproval(id: string) {
    setSubmitting(id);
    await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit_for_approval", id }) });
    setSubmitting(null); load();
  }

  async function deletePost(id: string) {
    setDeleting(id);
    await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    setDeleting(null); if (selectedId === id) setSelectedId(null); load();
  }

  const selected = posts.find((p) => p.id === selectedId) ?? null;
  const meta = PLATFORM_META[platform] ?? PLATFORM_META.twitter;
  const totalPosts = counts.reduce((s, c) => s + c._count, 0);

  if (status === "loading" || loading) return <div style={{ padding: 24, color: "#8E8E93" }}>Loading…</div>;

  return (
    <div style={{ display: "flex", height: "calc(100vh - var(--nav-height) - 24px)", margin: "-24px 0 0", overflow: "hidden", background: "#F5F5F7" }}>
      {/* Sidebar */}
      <div style={{ width: 260, background: "#1D1D1F", display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 12px" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>Social Media</p>
          <p style={{ fontSize: 11, color: "#636366" }}>{totalPosts} post{totalPosts !== 1 ? "s" : ""} total</p>
        </div>

        <div style={{ padding: "0 8px 8px" }}>
          {[
            { key: "", label: "All Posts" },
            { key: "draft", label: "Drafts" },
            { key: "in_review", label: "In Review" },
            { key: "approved", label: "Approved" },
            { key: "scheduled", label: "Scheduled" },
            { key: "posted", label: "Posted" },
          ].map((f) => {
            const count = f.key ? (counts.find((c) => c.status === f.key)?._count ?? 0) : totalPosts;
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
          <button onClick={() => { setShowCreate(true); setSelectedId(null); }}
            style={{ width: "100%", background: "#007AFF", color: "#fff", border: "none", borderRadius: 9, padding: "9px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + New Post
          </button>
        </div>
      </div>

      {/* Post list */}
      <div style={{ width: 300, background: "#fff", borderRight: "1px solid #E5E5EA", overflowY: "auto", flexShrink: 0 }}>
        {posts.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>📱</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F" }}>No posts yet</p>
            <p style={{ fontSize: 12, color: "#8E8E93" }}>Create your first post.</p>
          </div>
        ) : posts.map((post) => {
          const pm = PLATFORM_META[post.platform] ?? PLATFORM_META.twitter;
          const ss = STATUS_STYLE[post.status] ?? STATUS_STYLE.draft;
          return (
            <div key={post.id} onClick={() => { setSelectedId(post.id); setShowCreate(false); }}
              style={{ padding: "12px 14px", borderBottom: "1px solid #F5F5F7", cursor: "pointer", background: selectedId === post.id ? "#F0F4FF" : "#fff", borderLeft: selectedId === post.id ? `3px solid ${pm.color}` : "3px solid transparent" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: pm.color }}>{pm.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: ss.color, background: ss.bg, borderRadius: 5, padding: "1px 6px" }}>{post.status.replace("_", " ").toUpperCase()}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 10, color: "#8E8E93" }}>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <p style={{ fontSize: 13, color: "#1D1D1F", margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.content}</p>
              {post.scheduledFor && <p style={{ fontSize: 11, color: "#007AFF", margin: "4px 0 0" }}>📅 {new Date(post.scheduledFor).toLocaleString()}</p>}
            </div>
          );
        })}
      </div>

      {/* Detail / Create */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {showCreate ? (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: "0 0 20px" }}>New Post</h3>

            {/* Platform picker */}
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {Object.entries(PLATFORM_META).map(([key, pm]) => (
                <button key={key} onClick={() => setPlatform(key)}
                  style={{ padding: "8px 16px", borderRadius: 10, border: `2px solid ${platform === key ? pm.color : "#E5E5EA"}`, background: platform === key ? pm.color + "11" : "#fff", color: platform === key ? pm.color : "#6E6E73", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {pm.emoji} {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>

            {/* AI draft */}
            <div style={{ background: "#F0F4FF", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#007AFF", margin: "0 0 10px" }}>✨ AI Draft</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input placeholder="Topic (e.g. announcing our summer program)" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
                  style={{ flex: 1, border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }} />
                <input placeholder="Tone" value={aiTone} onChange={(e) => setAiTone(e.target.value)}
                  style={{ width: 140, border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }} />
              </div>
              <button onClick={aiDraft} disabled={aiLoading || !aiTopic}
                style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: !aiTopic ? 0.5 : 1 }}>
                {aiLoading ? "Drafting…" : "Generate Draft"}
              </button>
            </div>

            {/* Content */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5 }}>Post Content</label>
                <span style={{ fontSize: 11, color: content.length > meta.limit ? "#FF3B30" : "#8E8E93" }}>{content.length}/{meta.limit}</span>
              </div>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6}
                placeholder="Write your post here or use AI draft above…"
                style={{ width: "100%", border: `1.5px solid ${content.length > meta.limit ? "#FF3B30" : "#E5E5EA"}`, borderRadius: 9, padding: "10px 12px", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Schedule For (optional)</label>
                <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)}
                  style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes…"
                  style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={createPost} disabled={saving || !content || content.length > meta.limit}
                style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (!content || content.length > meta.limit) ? 0.5 : 1 }}>
                {saving ? "Saving…" : "Save Draft"}
              </button>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", color: "#8E8E93", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : selected ? (() => {
          const pm = PLATFORM_META[selected.platform] ?? PLATFORM_META.twitter;
          const ss = STATUS_STYLE[selected.status] ?? STATUS_STYLE.draft;
          return (
            <div style={{ maxWidth: 600 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: pm.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: pm.color }}>
                  {pm.emoji}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: "0 0 3px" }}>{selected.platform.charAt(0).toUpperCase() + selected.platform.slice(1)}</p>
                  <span style={{ fontSize: 12, fontWeight: 700, color: ss.color, background: ss.bg, borderRadius: 6, padding: "2px 8px" }}>{selected.status.replace("_", " ").toUpperCase()}</span>
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginBottom: 14, whiteSpace: "pre-wrap", fontSize: 15, color: "#1D1D1F", lineHeight: 1.6 }}>
                {selected.content}
              </div>

              {selected.scheduledFor && (
                <div style={{ background: "#007AFF11", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                  <p style={{ fontSize: 13, color: "#007AFF", margin: 0, fontWeight: 600 }}>📅 Scheduled: {new Date(selected.scheduledFor).toLocaleString()}</p>
                </div>
              )}

              {selected.notes && (
                <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                  <p style={{ fontSize: 13, color: "#3C3C43", margin: 0 }}>{selected.notes}</p>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {selected.status === "draft" && (
                  <button onClick={() => submitForApproval(selected.id)} disabled={submitting === selected.id}
                    style={{ background: "#FF9500", color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {submitting === selected.id ? "Submitting…" : "Submit for Approval"}
                  </button>
                )}
                <button onClick={() => deletePost(selected.id)} disabled={deleting === selected.id}
                  style={{ background: "transparent", color: "#FF3B30", border: "1.5px solid #FF3B3033", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {deleting === selected.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          );
        })() : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#8E8E93" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📱</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F" }}>Select a post</p>
            <p style={{ fontSize: 13 }}>Or create a new one with AI draft support.</p>
          </div>
        )}
      </div>
    </div>
  );
}
