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

const AGENT_META: Record<string, { icon: string; label: string; description: string; hours: string }> = {
  ceoAgent: {
    icon: "◆",
    label: "CEO Agent",
    description: "Sets morning priorities and delegates tasks to all agents",
    hours: "Business hours · 9 AM",
  },
  marketingAgent: {
    icon: "◈",
    label: "Marketing Agent",
    description: "Drafts X, LinkedIn, and Meta ad content",
    hours: "Business hours · 9 AM",
  },
  devAgent: {
    icon: "⊞",
    label: "Dev Agent",
    description: "Reviews platform health and prioritizes code improvements",
    hours: "Business hours · 9 AM",
  },
  inboxAgent: {
    icon: "✉",
    label: "Inbox Agent",
    description: "Drafts professional email replies and flags items for review",
    hours: "Business hours · 9 AM",
  },
  grantArchitectAgent: {
    icon: "★",
    label: "Grant Architect",
    description: "Researches grant opportunities and builds full strategy memos",
    hours: "Business hours · 9 AM",
  },
  upworkScoutAgent: {
    icon: "◎",
    label: "Upwork Scout",
    description: "Scans Upwork off-hours for jobs the team can complete autonomously",
    hours: "Off-hours · 5 PM",
  },
  jobExecutorAgent: {
    icon: "⚡",
    label: "Job Executor",
    description: "Completes top-scored Upwork jobs and logs earnings to Hardware Fund",
    hours: "Off-hours · 5 PM",
  },
  hardwareFundAgent: {
    icon: "◉",
    label: "Hardware Fund",
    description: "Tracks cumulative earnings and progress toward hardware upgrade tiers",
    hours: "Off-hours · 5 PM",
  },
};

function statusColor(status: string): string {
  if (status === "success") return "#34C759";
  if (status === "error") return "#FF3B30";
  return "#8E8E93";
}

function statusLabel(status: string): string {
  if (status === "success") return "Success";
  if (status === "error") return "Error";
  if (status === "never_run") return "Never Run";
  return status;
}

export default function AgentsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);

  useEffect(() => {
    fetch("/api/agents/status")
      .then((r) => r.json())
      .then(setRuns);
  }, []);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.5px" }}>
          Agents
        </h1>
        <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>
          8 agents — business hours 9 AM · off-hours Upwork loop 5 PM
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(AGENT_META).map(([agentId, meta]) => {
          const run = runs.find((r) => r.agentId === agentId);
          const isGrant = agentId === "grantArchitectAgent";
          const isOffHours = ["upworkScoutAgent", "jobExecutorAgent", "hardwareFundAgent"].includes(agentId);

          let taskSummary = "Not yet run";
          if (run && run.output) {
            try {
              const parsed = JSON.parse(
                run.output.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
              );
              if (agentId === "ceoAgent" && parsed.summary) taskSummary = parsed.summary;
              else if (agentId === "marketingAgent" && parsed.xPost) taskSummary = parsed.xPost;
              else if (agentId === "devAgent" && Array.isArray(parsed)) taskSummary = `${parsed.length} tasks identified`;
              else if (agentId === "inboxAgent" && parsed.emails) taskSummary = `${parsed.emails.length} emails drafted`;
              else if (agentId === "grantArchitectAgent" && parsed.topPick) taskSummary = `Top pick: ${parsed.topPick}`;
            } catch {
              taskSummary = run.output.slice(0, 100);
            }
          }

          return (
            <div
              key={agentId}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "20px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: isGrant ? "#1D1D1F" : isOffHours ? "#FF950018" : "#F5F5F7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  color: isGrant ? "#fff" : isOffHours ? "#FF9500" : "#1D1D1F",
                  flexShrink: 0,
                }}
              >
                {meta.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: "#1D1D1F" }}>{meta.label}</p>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: statusColor(run?.status || "never_run"),
                      background: `${statusColor(run?.status || "never_run")}18`,
                      borderRadius: 6,
                      padding: "2px 8px",
                    }}
                  >
                    {statusLabel(run?.status || "never_run")}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#6E6E73", marginBottom: 4 }}>{meta.description}</p>
                <p style={{ fontSize: 12, color: isOffHours ? "#FF9500" : "#8E8E93", marginBottom: 2 }}>{meta.hours}</p>
                <p style={{ fontSize: 13, color: "#8E8E93" }}>{taskSummary}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {run?.ranAt && (
                  <p style={{ fontSize: 12, color: "#8E8E93", marginBottom: 8 }}>
                    {new Date(run.ranAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {isGrant && (
                  <Link
                    href="/grants"
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#1D1D1F",
                      textDecoration: "none",
                      background: "#F5F5F7",
                      borderRadius: 8,
                      padding: "6px 12px",
                    }}
                  >
                    View Grants →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
