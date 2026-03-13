"use client";

import { useEffect, useState } from "react";

interface AgentRun {
  agentId: string;
  agentName: string;
  status: string;
  output: string;
  ranAt: string | null;
}

interface ActivityLog {
  id: string;
  time: string;
  agentId: string;
  label: string;
}

interface Grant {
  id: string;
  title: string;
  funder: string;
  missionScore: number;
  amount: string;
  hook: string;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "20px 24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [topGrant, setTopGrant] = useState<Grant | null>(null);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState("");

  async function fetchData() {
    const [runsRes, actRes, grantsRes] = await Promise.all([
      fetch("/api/agents/status"),
      fetch("/api/activity"),
      fetch("/api/grants"),
    ]);
    const runsData = await runsRes.json();
    const actData = await actRes.json();
    const grantsData = await grantsRes.json();
    setRuns(runsData);
    setActivity(actData);
    if (grantsData.length > 0) setTopGrant(grantsData[0]);
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleRunAgents() {
    setRunning(true);
    setRunMessage("");
    try {
      await fetch("/api/agents/run", { method: "POST" });
      setRunMessage("Agents started. Results will appear shortly.");
      setTimeout(() => fetchData(), 8000);
    } finally {
      setRunning(false);
    }
  }

  const completedAgents = runs.filter((r) => r.status === "success").length;
  const activeAgents = runs.filter((r) => r.status !== "never_run").length;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.5px" }}>
          Dashboard
        </h1>
        <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
        <Card>
          <p style={{ fontSize: 13, color: "#8E8E93", marginBottom: 6 }}>Tasks Completed</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: "#1D1D1F" }}>{completedAgents}</p>
        </Card>
        <Card>
          <p style={{ fontSize: 13, color: "#8E8E93", marginBottom: 6 }}>Active Agents</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: "#1D1D1F" }}>{activeAgents} / 5</p>
        </Card>
        <Card>
          <p style={{ fontSize: 13, color: "#8E8E93", marginBottom: 6 }}>Top Grant Score</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: "#34C759" }}>
            {topGrant ? `${topGrant.missionScore}/10` : "—"}
          </p>
        </Card>
      </div>

      {/* Grant Architect Spotlight */}
      {topGrant && (
        <div
          style={{
            background: "#1D1D1F",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 16,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Grant Architect — Top Match
              </p>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                {topGrant.title}
              </h2>
              <p style={{ color: "#8E8E93", fontSize: 14, marginBottom: 12 }}>{topGrant.funder}</p>
              <p style={{ color: "#A1A1A6", fontSize: 14, lineHeight: 1.5, maxWidth: 520 }}>
                {topGrant.hook}
              </p>
            </div>
            <div
              style={{
                background: "#34C759",
                borderRadius: 10,
                padding: "6px 14px",
                flexShrink: 0,
                marginLeft: 16,
              }}
            >
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{topGrant.missionScore}/10</p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log + Run Button */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
        <Card>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginBottom: 12 }}>
            Recent Activity
          </p>
          {activity.length === 0 ? (
            <p style={{ color: "#8E8E93", fontSize: 14 }}>No activity yet. Run agents to get started.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activity.map((log) => (
                <div key={log.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#34C759",
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />
                  <div>
                    <p style={{ fontSize: 14, color: "#1D1D1F" }}>{log.label}</p>
                    <p style={{ fontSize: 12, color: "#8E8E93" }}>
                      {new Date(log.time).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={handleRunAgents}
            disabled={running}
            style={{
              background: running ? "#8E8E93" : "#1D1D1F",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: running ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            {running ? "Starting…" : "Run Agents Now"}
          </button>
          {runMessage && (
            <p style={{ fontSize: 12, color: "#34C759", textAlign: "center" }}>{runMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
