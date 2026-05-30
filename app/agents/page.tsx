"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AgentRun {
  agentId: string;
  agentName: string;
  status: string;
  output: string;
  ranAt: string | null;
}

interface PendingApproval {
  id: string;
  agentId: string;
  agentName: string;
  actionType: string;
  title: string;
  description: string;
  payload: string;
  status: string;
  createdAt: string;
}

const AGENT_META: Record<string, { icon: string; label: string; description: string; hours: string; role: string }> = {
  ceoAgent: {
    icon: "◆",
    label: "CEO Agent",
    description: "Sets daily priorities and delegates tasks to all agents",
    hours: "Runs daily · 9 AM",
    role: "Thinks and directs — never takes action without delegating first",
  },
  marketingAgent: {
    icon: "◈",
    label: "Marketing Agent",
    description: "Drafts social media content for X, LinkedIn, and Meta",
    hours: "Runs daily · 9 AM",
    role: "Drafts content · waits for your approval before anything is posted",
  },
  devAgent: {
    icon: "⊞",
    label: "Dev Agent",
    description: "Reviews platform health and prioritizes improvements",
    hours: "Runs daily · 9 AM",
    role: "Observes and reports · no changes made without your review",
  },
  inboxAgent: {
    icon: "✉",
    label: "Inbox Agent",
    description: "Drafts professional emails to partners and donors",
    hours: "Runs daily · 9 AM",
    role: "Writes drafts · nothing is sent until you approve it",
  },
  grantArchitectAgent: {
    icon: "★",
    label: "Grant Architect",
    description: "Finds open grants and builds full strategy memos",
    hours: "Runs daily · 9 AM",
    role: "Researches and strategizes · submits nothing without your sign-off",
  },
  upworkScoutAgent: {
    icon: "◎",
    label: "Upwork Scout",
    description: "Finds freelance jobs the agent team can complete",
    hours: "Off-hours · 5 PM",
    role: "Finds opportunities · you choose which ones to pursue",
  },
  jobExecutorAgent: {
    icon: "⚡",
    label: "Job Executor",
    description: "Completes jobs and logs earnings toward hardware upgrades",
    hours: "Off-hours · 5 PM",
    role: "Completes work · every deliverable reviewed by you before submission",
  },
  hardwareFundAgent: {
    icon: "◉",
    label: "Hardware Fund",
    description: "Tracks earnings progress toward hardware upgrade tiers",
    hours: "Off-hours · 5 PM",
    role: "Tracks and reports only",
  },
};

const ACTION_ICONS: Record<string, string> = {
  email: "✉",
  social_post: "◈",
  job_deliverable: "⚡",
  grant_strategy: "★",
};

const ACTION_LABELS: Record<string, string> = {
  email: "Email Draft",
  social_post: "Social Post",
  job_deliverable: "Job Deliverable",
  grant_strategy: "Grant Strategy",
};

function statusColor(s: string) {
  if (s === "success") return "#34C759";
  if (s === "error") return "#FF3B30";
  return "#8E8E93";
}

function statusLabel(s: string) {
  if (s === "success") return "Success";
  if (s === "error") return "Error";
  if (s === "never_run") return "Never Run";
  return s;
}

export default function AgentsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<Record<string, string>>({});
  const [deciding, setDeciding] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function fetchAll() {
    const [r, a] = await Promise.all([
      fetch("/api/agents/status").then((r) => r.json()),
      fetch("/api/approvals").then((r) => r.json()),
    ]);
    setRuns(r);
    setApprovals(a);
  }

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, []);

  async function decide(id: string, action: "approved" | "rejected") {
    setDeciding(id);
    await fetch(`/api/approvals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userNote: noteText[id] ?? "" }),
    });
    setDeciding(null);
    setExpanded(null);
    fetchAll();
  }

  async function runAgents() {
    setRunning(true);
    await fetch("/api/agents/run", { method: "POST" });
    setTimeout(() => { setRunning(false); fetchAll(); }, 3000);
  }

  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending");

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.5px" }}>Agents</h1>
          <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>
            Your agents work automatically and bring anything important to you for approval.
          </p>
        </div>
        <button onClick={runAgents} disabled={running}
          style={{ background: running ? "#E5E5EA" : "#1D1D1F", color: running ? "#8E8E93" : "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: running ? "not-allowed" : "pointer" }}>
          {running ? "Running…" : "▶ Run Now"}
        </button>
      </div>

      {/* ── Approval Inbox ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Needs Your Approval</h2>
          {pending.length > 0 && (
            <span style={{ background: "#FF3B30", color: "#fff", fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>✅</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F" }}>All caught up</p>
            <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 4 }}>Your agents are working. Anything that needs your sign-off will appear here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map((item) => {
              const isOpen = expanded === item.id;
              let preview: Record<string, unknown> = {};
              try { preview = JSON.parse(item.payload); } catch { /* ok */ }

              return (
                <div key={item.id} style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", overflow: "hidden", border: "2px solid #FF9500" }}>
                  {/* Row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : item.id)}>
                    <span style={{ fontSize: 22, minWidth: 28 }}>{ACTION_ICONS[item.actionType] ?? "📋"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#FF9500", background: "#FFF3E0", padding: "2px 8px", borderRadius: 6, textTransform: "uppercase" }}>
                          {ACTION_LABELS[item.actionType] ?? item.actionType}
                        </span>
                        <span style={{ fontSize: 12, color: "#8E8E93" }}>{item.agentName}</span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>{item.title}</p>
                      <p style={{ fontSize: 13, color: "#6E6E73", margin: "2px 0 0" }}>{item.description}</p>
                    </div>
                    <span style={{ fontSize: 18, color: "#8E8E93", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>⌄</span>
                  </div>

                  {/* Expanded preview + actions */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid #F0F0F0", padding: "18px 20px", background: "#FAFAFA" }}>

                      {/* Content preview */}
                      <div style={{ marginBottom: 16 }}>
                        {item.actionType === "email" && (
                          <div style={{ background: "#fff", border: "1px solid #E5E5EA", borderRadius: 10, padding: 16 }}>
                            <p style={{ fontSize: 12, color: "#8E8E93", margin: "0 0 4px" }}>TO</p>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: "0 0 12px" }}>{(preview as {to?: string}).to}</p>
                            <p style={{ fontSize: 12, color: "#8E8E93", margin: "0 0 4px" }}>SUBJECT</p>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: "0 0 12px" }}>{(preview as {subject?: string}).subject}</p>
                            <p style={{ fontSize: 12, color: "#8E8E93", margin: "0 0 4px" }}>BODY</p>
                            <p style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{(preview as {body?: string}).body}</p>
                          </div>
                        )}
                        {item.actionType === "social_post" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {(preview as {xPost?: string}).xPost && (
                              <div style={{ background: "#fff", border: "1px solid #E5E5EA", borderRadius: 10, padding: 14 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 6px" }}>X (Twitter)</p>
                                <p style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.6, margin: 0 }}>{(preview as {xPost?: string}).xPost}</p>
                              </div>
                            )}
                            {(preview as {linkedInPost?: string}).linkedInPost && (
                              <div style={{ background: "#fff", border: "1px solid #E5E5EA", borderRadius: 10, padding: 14 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 6px" }}>LinkedIn</p>
                                <p style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.6, margin: 0 }}>{(preview as {linkedInPost?: string}).linkedInPost}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {(item.actionType === "job_deliverable" || item.actionType === "grant_strategy") && (
                          <div style={{ background: "#fff", border: "1px solid #E5E5EA", borderRadius: 10, padding: 16, maxHeight: 300, overflowY: "auto" }}>
                            <pre style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>
                              {JSON.stringify(preview, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>

                      {/* Optional note */}
                      <textarea
                        value={noteText[item.id] ?? ""}
                        onChange={(e) => setNoteText((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder="Add a note for the agent (optional — e.g. 'change the tone' or 'update the budget number')"
                        rows={2}
                        style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#1D1D1F", resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 14, fontFamily: "inherit" }}
                      />

                      {/* Approve / Reject */}
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => decide(item.id, "approved")} disabled={deciding === item.id}
                          style={{ flex: 1, background: "#34C759", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 700, cursor: deciding === item.id ? "not-allowed" : "pointer" }}>
                          {deciding === item.id ? "…" : "✓ Approve"}
                        </button>
                        <button onClick={() => decide(item.id, "rejected")} disabled={deciding === item.id}
                          style={{ flex: 1, background: "#fff", color: "#FF3B30", border: "2px solid #FF3B30", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 700, cursor: deciding === item.id ? "not-allowed" : "pointer" }}>
                          {deciding === item.id ? "…" : "✗ Reject"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Agent roster ── */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", marginBottom: 14 }}>Your Agent Team</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(AGENT_META).map(([agentId, meta]) => {
          const run = runs.find((r) => r.agentId === agentId);
          const isOffHours = ["upworkScoutAgent", "jobExecutorAgent", "hardwareFundAgent"].includes(agentId);

          let taskSummary = "Not yet run";
          if (run?.output) {
            try {
              const parsed = JSON.parse(run.output.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
              if (agentId === "ceoAgent" && parsed.summary) taskSummary = parsed.summary;
              else if (agentId === "marketingAgent" && parsed.xPost) taskSummary = `Draft ready for review`;
              else if (agentId === "devAgent" && Array.isArray(parsed)) taskSummary = `${parsed.length} improvements identified`;
              else if (agentId === "inboxAgent" && parsed.emails) taskSummary = `${parsed.emails.length} email draft(s) ready for review`;
              else if (agentId === "grantArchitectAgent" && parsed.topPick) taskSummary = `Strategy ready: ${parsed.topPick}`;
            } catch {
              taskSummary = run.status === "error" ? "Error — check AI model in Settings" : run.output.slice(0, 80);
            }
          }

          const agentPending = pending.filter((a) => a.agentId === agentId).length;

          return (
            <div key={agentId} style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: isOffHours ? "#FF950018" : "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: isOffHours ? "#FF9500" : "#1D1D1F", flexShrink: 0 }}>
                {meta.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: "#1D1D1F", margin: 0 }}>{meta.label}</p>
                  <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(run?.status || "never_run"), background: `${statusColor(run?.status || "never_run")}18`, borderRadius: 6, padding: "2px 8px" }}>
                    {statusLabel(run?.status || "never_run")}
                  </span>
                  {agentPending > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: "#FF9500", color: "#fff", borderRadius: 6, padding: "2px 8px" }}>
                      {agentPending} awaiting approval
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: "#6E6E73", margin: "0 0 3px" }}>{meta.description}</p>
                <p style={{ fontSize: 12, color: "#8E8E93", margin: "0 0 3px", fontStyle: "italic" }}>{meta.role}</p>
                <p style={{ fontSize: 12, color: isOffHours ? "#FF9500" : "#8E8E93", margin: 0 }}>{meta.hours}</p>
                {taskSummary !== "Not yet run" && (
                  <p style={{ fontSize: 13, color: "#1D1D1F", marginTop: 6, background: "#F5F5F7", borderRadius: 8, padding: "6px 10px", display: "inline-block" }}>{taskSummary}</p>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                {run?.ranAt && <p style={{ fontSize: 12, color: "#8E8E93", textAlign: "right" }}>{new Date(run.ranAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
                {agentId === "grantArchitectAgent" && (
                  <Link href="/grants" style={{ fontSize: 13, fontWeight: 500, color: "#1D1D1F", textDecoration: "none", background: "#F5F5F7", borderRadius: 8, padding: "6px 12px", display: "inline-block", marginTop: 6 }}>View Grants →</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── History ── */}
      {decided.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", marginBottom: 14 }}>Approval History</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {decided.slice(0, 10).map((item) => (
              <div key={item.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>{item.status === "approved" ? "✅" : "❌"}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>{item.title}</p>
                  <p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0" }}>{item.agentName} · {item.status}</p>
                </div>
                <p style={{ fontSize: 12, color: "#8E8E93" }}>{new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
