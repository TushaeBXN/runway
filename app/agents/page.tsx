"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AgentRun { agentId: string; agentName: string; status: string; output: string; ranAt: string | null; }
interface PendingApproval { id: string; agentId: string; agentName: string; actionType: string; title: string; description: string; payload: string; status: string; createdAt: string; }
interface AgentDefinition { agentId: string; name: string; role: string; capabilities: string[]; schedule: string; employmentType: string; status: string; isBuiltIn: boolean; retiredReason?: string; total: number; errors: number; errorRate: number; lastRun?: string; }

const AGENT_META: Record<string, { icon: string; label: string; description: string; hours: string; role: string }> = {
  ceoAgent: { icon: "◆", label: "CEO Agent", description: "Sets daily priorities and delegates tasks to all agents", hours: "Runs daily · 9 AM", role: "Thinks and directs — never takes action without delegating first" },
  marketingAgent: { icon: "◈", label: "Marketing Agent", description: "Drafts social media content for X, LinkedIn, and Meta", hours: "Runs daily · 9 AM", role: "Drafts content · waits for your approval before anything is posted" },
  devAgent: { icon: "⊞", label: "Dev Agent", description: "Reviews platform health and prioritizes improvements", hours: "Runs daily · 9 AM", role: "Observes and reports · no changes made without your review" },
  inboxAgent: { icon: "✉", label: "Inbox Agent", description: "Reads real inbox and drafts professional email replies", hours: "Runs daily · 9 AM", role: "Writes drafts · nothing is sent until you approve it" },
  grantArchitectAgent: { icon: "★", label: "Grant Architect", description: "Finds open grants and builds full strategy memos", hours: "Runs daily · 9 AM", role: "Researches and strategizes · submits nothing without your sign-off" },
  upworkScoutAgent: { icon: "◎", label: "Upwork Scout", description: "Finds freelance jobs the agent team can complete", hours: "Off-hours · 5 PM", role: "Finds opportunities · you choose which ones to pursue" },
  jobExecutorAgent: { icon: "⚡", label: "Job Executor", description: "Completes jobs and logs earnings toward hardware upgrades", hours: "Off-hours · 5 PM", role: "Completes work · every deliverable reviewed by you before submission" },
  hardwareFundAgent: { icon: "◉", label: "Hardware Fund", description: "Tracks cumulative earnings and progress toward hardware tiers", hours: "Off-hours · 5 PM", role: "Tracks and reports only" },
};

const ACTION_ICONS: Record<string, string> = { email: "✉", social_post: "◈", job_deliverable: "⚡", grant_strategy: "★" };
const ACTION_LABELS: Record<string, string> = { email: "Email Draft", social_post: "Social Post", job_deliverable: "Job Deliverable", grant_strategy: "Grant Strategy" };
function statusColor(s: string) { if (s === "success") return "#34C759"; if (s === "error") return "#FF3B30"; return "#8E8E93"; }
function statusLabel(s: string) { if (s === "success") return "Success"; if (s === "error") return "Error"; if (s === "never_run") return "Never Run"; return s; }

export default function AgentsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [workforce, setWorkforce] = useState<AgentDefinition[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<Record<string, string>>({});
  const [deciding, setDeciding] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"approvals" | "team" | "workforce">("approvals");
  const [showHire, setShowHire] = useState(false);
  const [hireForm, setHireForm] = useState({ name: "", role: "", capabilities: "", schedule: "manual", employmentType: "temporary" });
  const [hireSaving, setHireSaving] = useState(false);

  async function fetchAll() {
    const [r, a, w] = await Promise.all([
      fetch("/api/agents/status").then(r => r.json()),
      fetch("/api/approvals").then(r => r.json()),
      fetch("/api/agents/workforce").then(r => r.json()),
    ]);
    setRuns(r); setApprovals(a); setWorkforce(Array.isArray(w) ? w : []);
  }

  useEffect(() => { fetchAll(); const iv = setInterval(fetchAll, 30000); return () => clearInterval(iv); }, []);

  async function decide(id: string, action: "approved" | "rejected") {
    setDeciding(id);
    await fetch(`/api/approvals/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, userNote: noteText[id] ?? "" }) });
    setDeciding(null); setExpanded(null); fetchAll();
  }

  async function runAgents() { setRunning(true); await fetch("/api/agents/run", { method: "POST" }); setTimeout(() => { setRunning(false); fetchAll(); }, 3000); }

  async function hireAgent() {
    setHireSaving(true);
    await fetch("/api/agents/workforce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "hire", name: hireForm.name, role: hireForm.role, capabilities: hireForm.capabilities.split(",").map(s => s.trim()).filter(Boolean), schedule: hireForm.schedule, employmentType: hireForm.employmentType }) });
    setHireForm({ name: "", role: "", capabilities: "", schedule: "manual", employmentType: "temporary" }); setShowHire(false); setHireSaving(false); fetchAll();
  }

  async function fireAgent(agentId: string) {
    if (!confirm("Retire this agent? This will stop them from running.")) return;
    await fetch("/api/agents/workforce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "fire", agentId, reason: "Retired by owner" }) });
    fetchAll();
  }

  const pending = approvals.filter(a => a.status === "pending");
  const decided = approvals.filter(a => a.status !== "pending");

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.5px" }}>Agents</h1>
          <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>Your agents work automatically and bring anything important to you for approval.</p>
        </div>
        <button onClick={runAgents} disabled={running} style={{ background: running ? "#E5E5EA" : "#1D1D1F", color: running ? "#8E8E93" : "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: running ? "not-allowed" : "pointer" }}>
          {running ? "Running…" : "▶ Run Now"}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#F5F5F7", borderRadius: 12, padding: 4 }}>
        {([["approvals", "Needs Approval"], ["team", "Agent Team"], ["workforce", "Workforce"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: "8px 4px", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", background: activeTab === id ? "#fff" : "transparent", color: activeTab === id ? "#1D1D1F" : "#6E6E73", boxShadow: activeTab === id ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
            {label}{id === "approvals" && pending.length > 0 && <span style={{ marginLeft: 6, background: "#FF3B30", color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 10 }}>{pending.length}</span>}
          </button>
        ))}
      </div>

      {/* ── Approvals tab ── */}
      {activeTab === "approvals" && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Needs Your Approval</h2>
            {pending.length > 0 && <span style={{ background: "#FF3B30", color: "#fff", fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>{pending.length}</span>}
          </div>

          {pending.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", textAlign: "center" }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>✅</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F" }}>All caught up</p>
              <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 4 }}>Your agents are working. Anything that needs your sign-off will appear here.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pending.map(item => {
                const isOpen = expanded === item.id;
                let preview: Record<string, unknown> = {};
                try { preview = JSON.parse(item.payload); } catch { /* ok */ }
                return (
                  <div key={item.id} style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", overflow: "hidden", border: "2px solid #FF9500" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : item.id)}>
                      <span style={{ fontSize: 22, minWidth: 28 }}>{ACTION_ICONS[item.actionType] ?? "📋"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#FF9500", background: "#FFF3E0", padding: "2px 8px", borderRadius: 6, textTransform: "uppercase" }}>{ACTION_LABELS[item.actionType] ?? item.actionType}</span>
                          <span style={{ fontSize: 12, color: "#8E8E93" }}>{item.agentName}</span>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>{item.title}</p>
                        <p style={{ fontSize: 13, color: "#6E6E73", margin: "2px 0 0" }}>{item.description}</p>
                      </div>
                      <span style={{ fontSize: 18, color: "#8E8E93", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>⌄</span>
                    </div>
                    {isOpen && (
                      <div style={{ borderTop: "1px solid #F0F0F0", padding: "18px 20px", background: "#FAFAFA" }}>
                        {item.actionType === "email" && (
                          <div style={{ background: "#fff", border: "1px solid #E5E5EA", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                            <p style={{ fontSize: 12, color: "#8E8E93", margin: "0 0 4px" }}>TO</p><p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: "0 0 12px" }}>{(preview as {to?: string}).to}</p>
                            <p style={{ fontSize: 12, color: "#8E8E93", margin: "0 0 4px" }}>SUBJECT</p><p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: "0 0 12px" }}>{(preview as {subject?: string}).subject}</p>
                            <p style={{ fontSize: 12, color: "#8E8E93", margin: "0 0 4px" }}>BODY</p><p style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{(preview as {body?: string}).body}</p>
                          </div>
                        )}
                        {item.actionType === "social_post" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                            {(preview as {xPost?: string}).xPost && <div style={{ background: "#fff", border: "1px solid #E5E5EA", borderRadius: 10, padding: 14 }}><p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 6px" }}>X (Twitter)</p><p style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.6, margin: 0 }}>{(preview as {xPost?: string}).xPost}</p></div>}
                            {(preview as {linkedInPost?: string}).linkedInPost && <div style={{ background: "#fff", border: "1px solid #E5E5EA", borderRadius: 10, padding: 14 }}><p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 6px" }}>LinkedIn</p><p style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.6, margin: 0 }}>{(preview as {linkedInPost?: string}).linkedInPost}</p></div>}
                          </div>
                        )}
                        {(item.actionType === "job_deliverable" || item.actionType === "grant_strategy") && (
                          <div style={{ background: "#fff", border: "1px solid #E5E5EA", borderRadius: 10, padding: 16, maxHeight: 300, overflowY: "auto", marginBottom: 16 }}>
                            <pre style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>{JSON.stringify(preview, null, 2)}</pre>
                          </div>
                        )}
                        <textarea value={noteText[item.id] ?? ""} onChange={e => setNoteText(p => ({ ...p, [item.id]: e.target.value }))} placeholder="Add a note for the agent (optional — e.g. 'change the tone')" rows={2}
                          style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 10, padding: "10px 14px", fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 14, fontFamily: "inherit" }} />
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => decide(item.id, "approved")} disabled={deciding === item.id} style={{ flex: 1, background: "#34C759", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 700, cursor: deciding === item.id ? "not-allowed" : "pointer" }}>{deciding === item.id ? "…" : "✓ Approve"}</button>
                          <button onClick={() => decide(item.id, "rejected")} disabled={deciding === item.id} style={{ flex: 1, background: "#fff", color: "#FF3B30", border: "2px solid #FF3B30", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 700, cursor: deciding === item.id ? "not-allowed" : "pointer" }}>{deciding === item.id ? "…" : "✗ Reject"}</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {decided.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", marginBottom: 14 }}>Approval History</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {decided.slice(0, 10).map(item => (
                  <div key={item.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 18 }}>{item.status === "approved" ? "✅" : "❌"}</span>
                    <div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>{item.title}</p><p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0" }}>{item.agentName} · {item.status}</p></div>
                    <p style={{ fontSize: 12, color: "#8E8E93" }}>{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Agent team tab ── */}
      {activeTab === "team" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.entries(AGENT_META).map(([agentId, meta]) => {
            const run = runs.find(r => r.agentId === agentId);
            const isOffHours = ["upworkScoutAgent", "jobExecutorAgent", "hardwareFundAgent"].includes(agentId);
            const agentDef = workforce.find(w => w.agentId === agentId);
            let taskSummary = "Not yet run";
            if (run?.output) {
              try {
                const parsed = JSON.parse(run.output.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
                if (agentId === "ceoAgent" && parsed.summary) taskSummary = parsed.summary;
                else if (agentId === "marketingAgent" && parsed.xPost) taskSummary = "Draft ready for review";
                else if (agentId === "devAgent" && Array.isArray(parsed)) taskSummary = `${parsed.length} improvements identified`;
                else if (agentId === "inboxAgent" && parsed.emails) taskSummary = `${parsed.emails.length} email draft(s) ready for review`;
                else if (agentId === "grantArchitectAgent" && parsed.topPick) taskSummary = `Strategy ready: ${parsed.topPick}`;
              } catch { taskSummary = run.status === "error" ? "Error — check AI model in Settings" : run.output.slice(0, 80); }
            }
            const agentPending = pending.filter(a => a.agentId === agentId).length;
            return (
              <div key={agentId} style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: isOffHours ? "#FF950018" : "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: isOffHours ? "#FF9500" : "#1D1D1F", flexShrink: 0 }}>{meta.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: "#1D1D1F", margin: 0 }}>{meta.label}</p>
                    <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(run?.status || "never_run"), background: `${statusColor(run?.status || "never_run")}18`, borderRadius: 6, padding: "2px 8px" }}>{statusLabel(run?.status || "never_run")}</span>
                    {agentPending > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: "#FF9500", color: "#fff", borderRadius: 6, padding: "2px 8px" }}>{agentPending} awaiting approval</span>}
                    {agentDef && <span style={{ fontSize: 11, color: "#8E8E93", background: "#F5F5F7", borderRadius: 6, padding: "2px 8px" }}>Built-in · Permanent</span>}
                  </div>
                  <p style={{ fontSize: 13, color: "#6E6E73", margin: "0 0 3px" }}>{meta.description}</p>
                  <p style={{ fontSize: 12, color: "#8E8E93", margin: "0 0 3px", fontStyle: "italic" }}>{meta.role}</p>
                  <p style={{ fontSize: 12, color: isOffHours ? "#FF9500" : "#8E8E93", margin: 0 }}>{meta.hours}</p>
                  {taskSummary !== "Not yet run" && <p style={{ fontSize: 13, color: "#1D1D1F", marginTop: 6, background: "#F5F5F7", borderRadius: 8, padding: "6px 10px", display: "inline-block" }}>{taskSummary}</p>}
                </div>
                <div style={{ flexShrink: 0 }}>
                  {run?.ranAt && <p style={{ fontSize: 12, color: "#8E8E93", textAlign: "right" }}>{new Date(run.ranAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
                  {agentId === "grantArchitectAgent" && <Link href="/grants" style={{ fontSize: 13, fontWeight: 500, color: "#1D1D1F", textDecoration: "none", background: "#F5F5F7", borderRadius: 8, padding: "6px 12px", display: "inline-block", marginTop: 6 }}>View Grants →</Link>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Workforce tab ── */}
      {activeTab === "workforce" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Security banner */}
          <div style={{ background: "#F0FFF4", border: "1.5px solid #34C759", borderRadius: 14, padding: "14px 18px", display: "flex", gap: 12 }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: "0 0 4px" }}>Security & Compliance</p>
              <p style={{ fontSize: 13, color: "#6E6E73", margin: 0, lineHeight: 1.6 }}>
                Every agent operates within defined role boundaries. No agent sends communications, submits work, or makes financial decisions without your explicit approval. All credentials encrypted with AES-256-GCM. Every action is logged.
              </p>
            </div>
          </div>

          {/* Custom agents */}
          {workforce.filter(a => !a.isBuiltIn).map(agent => (
            <div key={agent.agentId} style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: agent.status === "retired" ? "#F5F5F7" : agent.status === "probation" ? "#FFF3E0" : "#F0FFF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🤖</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>{agent.name}</p>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: agent.status === "active" ? "#F0FFF4" : agent.status === "probation" ? "#FFF3E0" : "#F5F5F7", color: agent.status === "active" ? "#34C759" : agent.status === "probation" ? "#FF9500" : "#8E8E93" }}>{agent.status.toUpperCase()}</span>
                  <span style={{ fontSize: 11, color: "#8E8E93", background: "#F5F5F7", padding: "2px 8px", borderRadius: 6 }}>{agent.employmentType}</span>
                </div>
                <p style={{ fontSize: 13, color: "#6E6E73", margin: "0 0 6px" }}>{agent.role.slice(0, 140)}{agent.role.length > 140 ? "…" : ""}</p>
                <div style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 12, color: "#8E8E93" }}>Runs: {agent.total}</span>
                  <span style={{ fontSize: 12, color: agent.errorRate > 50 ? "#FF3B30" : "#8E8E93" }}>Error rate: {agent.errorRate}%</span>
                  <span style={{ fontSize: 12, color: "#8E8E93" }}>Schedule: {agent.schedule}</span>
                </div>
                {agent.retiredReason && <p style={{ fontSize: 12, color: "#FF3B30", marginTop: 4 }}>Retired: {agent.retiredReason}</p>}
              </div>
              {agent.status !== "retired" && (
                <button onClick={() => fireAgent(agent.agentId)} style={{ fontSize: 12, fontWeight: 700, color: "#FF3B30", background: "none", border: "1.5px solid #FF3B30", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>Retire</button>
              )}
            </div>
          ))}

          {workforce.filter(a => !a.isBuiltIn).length === 0 && !showHire && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
              <p style={{ fontSize: 14, color: "#8E8E93" }}>No custom agents yet. Hire one when you need extra capacity or a specialized role.</p>
            </div>
          )}

          {/* Hire form */}
          {!showHire ? (
            <button onClick={() => setShowHire(true)} style={{ background: "#1D1D1F", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>+ Hire a New Agent</button>
          ) : (
            <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: "0 0 6px" }}>Hire a New Agent</p>
              <p style={{ fontSize: 13, color: "#6E6E73", marginBottom: 20 }}>Define the agent&apos;s role clearly. The more specific, the better they perform. The CEO Agent can also recommend hiring when workload is too high.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>Agent Name</p>
                  <input value={hireForm.name} onChange={e => setHireForm(p => ({ ...p, name: e.target.value }))} placeholder='e.g. "Donor Research Agent" or "Newsletter Writer"' style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>Role & Boundaries</p>
                  <textarea value={hireForm.role} onChange={e => setHireForm(p => ({ ...p, role: e.target.value }))} rows={4} placeholder="Describe what this agent does, what decisions it can make, and what it must never do without human approval..." style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>Capabilities (comma-separated)</p>
                  <input value={hireForm.capabilities} onChange={e => setHireForm(p => ({ ...p, capabilities: e.target.value }))} placeholder="research, writing, data analysis, web search" style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>Employment Type</p>
                    <select value={hireForm.employmentType} onChange={e => setHireForm(p => ({ ...p, employmentType: e.target.value }))} style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box" }}>
                      <option value="temporary">Temporary — one task</option>
                      <option value="part_time">Part-time — specific schedule</option>
                      <option value="permanent">Permanent — always on</option>
                    </select>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>When to Run</p>
                    <select value={hireForm.schedule} onChange={e => setHireForm(p => ({ ...p, schedule: e.target.value }))} style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box" }}>
                      <option value="manual">Manual (on demand)</option>
                      <option value="business">Business hours (9 AM)</option>
                      <option value="off_hours">Off-hours (5 PM)</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={hireAgent} disabled={hireSaving || !hireForm.name || !hireForm.role} style={{ background: !hireForm.name || !hireForm.role ? "#E5E5EA" : "#34C759", color: !hireForm.name || !hireForm.role ? "#8E8E93" : "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: !hireForm.name || !hireForm.role ? "not-allowed" : "pointer" }}>
                    {hireSaving ? "Hiring…" : "Hire Agent"}
                  </button>
                  <button onClick={() => setShowHire(false)} style={{ background: "none", border: "none", fontSize: 14, color: "#8E8E93", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
