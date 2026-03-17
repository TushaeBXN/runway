"use client";

import { useEffect, useState } from "react";

interface UpworkJob {
  id: string;
  title: string;
  budget: string;
  description: string;
  skills: string;
  score: number;
  status: string;
  earnings: number;
  assignedAgent: string | null;
  upworkUrl: string | null;
  deliverable: string | null;
  createdAt: string;
}

const AGENT_LABELS: Record<string, string> = {
  ceoAgent: "CEO Agent",
  marketingAgent: "Marketing Agent",
  devAgent: "Dev Agent",
  inboxAgent: "Inbox Agent",
  grantArchitectAgent: "Grant Architect",
  upworkScoutAgent: "Upwork Scout",
  jobExecutorAgent: "Job Executor",
};

function statusColor(status: string): string {
  if (status === "completed") return "#34C759";
  if (status === "in_progress") return "#007AFF";
  if (status === "failed") return "#FF3B30";
  return "#8E8E93";
}

function statusLabel(status: string): string {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In Progress";
  if (status === "failed") return "Failed";
  if (status === "pending") return "Pending";
  return status;
}

export default function UpworkPage() {
  const [jobs, setJobs] = useState<UpworkJob[]>([]);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function fetchJobs() {
    const res = await fetch("/api/upwork");
    const data = await res.json();
    setJobs(data);
  }

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleRunOffHours() {
    setRunning(true);
    setRunMessage("");
    try {
      await fetch("/api/upwork/run", { method: "POST" });
      setRunMessage("Off-hours loop started. Scout and Executor are running…");
      setTimeout(() => fetchJobs(), 10000);
    } finally {
      setRunning(false);
    }
  }

  const totalEarned = jobs
    .filter((j) => j.status === "completed")
    .reduce((sum, j) => sum + j.earnings, 0);

  const completedCount = jobs.filter((j) => j.status === "completed").length;
  const pendingCount = jobs.filter((j) => j.status === "pending").length;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.5px" }}>
          Upwork Jobs
        </h1>
        <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>
          Off-hours mode: 5:00 PM – 9:00 AM — agents earn for hardware upgrades
        </p>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
        {[
          { label: "Total Earned", value: `$${totalEarned.toFixed(2)}`, color: "#34C759" },
          { label: "Jobs Completed", value: String(completedCount), color: "#1D1D1F" },
          { label: "In Queue", value: String(pendingCount), color: "#8E8E93" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "20px 24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
            }}
          >
            <p style={{ fontSize: 13, color: "#8E8E93", marginBottom: 6 }}>{stat.label}</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Run button */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={handleRunOffHours}
          disabled={running}
          style={{
            background: running ? "#8E8E93" : "#1D1D1F",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          {running ? "Running…" : "Run Off-Hours Loop Now"}
        </button>
        {runMessage && (
          <p style={{ fontSize: 13, color: "#34C759" }}>{runMessage}</p>
        )}
      </div>

      {/* Job list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {jobs.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "32px 24px",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
            }}
          >
            <p style={{ color: "#8E8E93", fontSize: 14 }}>
              No jobs yet. Run the off-hours loop to scan Upwork.
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "20px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                {/* Score badge */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: job.score >= 80 ? "#1D1D1F" : "#F5F5F7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: job.score >= 80 ? "#fff" : "#1D1D1F",
                    flexShrink: 0,
                  }}
                >
                  {job.score}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: "#1D1D1F" }}>{job.title}</p>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: statusColor(job.status),
                        background: `${statusColor(job.status)}18`,
                        borderRadius: 6,
                        padding: "2px 8px",
                      }}
                    >
                      {statusLabel(job.status)}
                    </span>
                    {job.status === "completed" && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#34C759",
                          background: "#34C75918",
                          borderRadius: 6,
                          padding: "2px 8px",
                        }}
                      >
                        +${job.earnings.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: 13, color: "#6E6E73", marginBottom: 6 }}>{job.description}</p>

                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{job.budget}</span>
                    {job.assignedAgent && (
                      <span style={{ fontSize: 12, color: "#8E8E93" }}>
                        → {AGENT_LABELS[job.assignedAgent] ?? job.assignedAgent}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: "#8E8E93" }}>
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Skills */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {job.skills.split(", ").map((skill) => (
                      <span
                        key={skill}
                        style={{
                          fontSize: 11,
                          color: "#6E6E73",
                          background: "#F5F5F7",
                          borderRadius: 6,
                          padding: "2px 8px",
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expand deliverable */}
                {job.deliverable && (
                  <button
                    onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#1D1D1F",
                      background: "#F5F5F7",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 12px",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {expandedId === job.id ? "Hide" : "View"}
                  </button>
                )}
              </div>

              {/* Deliverable expand */}
              {expandedId === job.id && job.deliverable && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "16px",
                    background: "#F5F5F7",
                    borderRadius: 12,
                    fontSize: 13,
                    color: "#1D1D1F",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    maxHeight: 400,
                    overflowY: "auto",
                  }}
                >
                  {job.deliverable}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
