"use client";

import { useEffect, useState } from "react";

interface Grant {
  id: string;
  title: string;
  funder: string;
  missionScore: number;
  deadline: string;
  amount: string;
  hook: string;
  kpis: string[];
  budget: Record<string, string | number>;
  checklist: string[];
  rawOutput: string;
  createdAt: string;
}

interface StrategyMemo {
  sustainabilityPlan?: string;
  hostileReview?: { weakness: string; response: string }[];
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "#F0F0F0",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score * 10}%`,
            height: "100%",
            background: score >= 8 ? "#34C759" : score >= 5 ? "#FF9F0A" : "#FF3B30",
            borderRadius: 3,
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", minWidth: 36 }}>
        {score}/10
      </span>
    </div>
  );
}

export default function GrantsPage() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [selected, setSelected] = useState<Grant | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/grants")
      .then((r) => r.json())
      .then((data: Grant[]) => {
        setGrants(data);
        if (data.length > 0) setSelected(data[0]);
      });
  }, []);

  function toggleCheck(item: string) {
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }));
  }

  function handlePrint() {
    window.print();
  }

  let memo: StrategyMemo = {};
  let allOpportunities: { title: string; funder: string; missionScore: number; deadline: string; amount: string }[] = [];

  if (selected) {
    try {
      const raw = JSON.parse(
        selected.rawOutput
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim()
      );
      memo = raw.strategyMemo || {};
      allOpportunities = raw.opportunities || [];
    } catch {
      // use fallback
    }
  }

  const displayOpportunities = allOpportunities.length > 0
    ? allOpportunities
    : grants.map((g) => ({
        title: g.title,
        funder: g.funder,
        missionScore: g.missionScore,
        deadline: g.deadline,
        amount: g.amount,
      }));

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.5px" }}>
            Grants
          </h1>
          <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>
            R-A-W Protocol — Research, Architect, Win
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="no-print"
          style={{
            background: "#F5F5F7",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 500,
            color: "#1D1D1F",
            cursor: "pointer",
          }}
        >
          Export as PDF
        </button>
      </div>

      {grants.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "40px 24px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
          }}
        >
          <p style={{ color: "#8E8E93", fontSize: 15 }}>
            No grant data yet. Run agents to generate grant opportunities.
          </p>
        </div>
      ) : (
        <>
          {/* Mission-Match Scores */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "20px 24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginBottom: 16 }}>
              Mission-Match Scores
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {displayOpportunities.map((opp, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#1D1D1F" }}>{opp.title}</p>
                      <p style={{ fontSize: 12, color: "#8E8E93" }}>
                        {opp.funder} · {opp.amount} · Due: {opp.deadline}
                      </p>
                    </div>
                  </div>
                  <ScoreBar score={opp.missionScore} />
                </div>
              ))}
            </div>
          </div>

          {selected && (
            <>
              {/* Hook */}
              <div
                style={{
                  background: "#1D1D1F",
                  borderRadius: 16,
                  padding: "24px 28px",
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "#8E8E93",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 12,
                  }}
                >
                  Strategy Memo — {selected.title}
                </p>
                <p style={{ fontSize: 16, color: "#fff", lineHeight: 1.6 }}>{selected.hook}</p>
              </div>

              {/* KPIs */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: "20px 24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                  marginBottom: 16,
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginBottom: 12 }}>
                  Impact Metrics (KPIs)
                </p>
                {selected.kpis.map((kpi: string, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                    <span
                      style={{
                        background: "#34C75918",
                        color: "#34C759",
                        borderRadius: 6,
                        padding: "2px 8px",
                        fontSize: 12,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      KPI {i + 1}
                    </span>
                    <p style={{ fontSize: 14, color: "#1D1D1F" }}>{kpi}</p>
                  </div>
                ))}
              </div>

              {/* Budget */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: "20px 24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                  marginBottom: 16,
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginBottom: 12 }}>
                  Technical Budget
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {Object.entries(selected.budget).map(([key, val]) => (
                      <tr
                        key={key}
                        style={{ borderBottom: "1px solid #F5F5F7" }}
                      >
                        <td
                          style={{
                            padding: "10px 0",
                            fontSize: 14,
                            color: key === "total" ? "#1D1D1F" : "#6E6E73",
                            fontWeight: key === "total" ? 600 : 400,
                            textTransform: "capitalize",
                          }}
                        >
                          {key.replace(/([A-Z])/g, " $1")}
                        </td>
                        <td
                          style={{
                            padding: "10px 0",
                            fontSize: 14,
                            color: "#1D1D1F",
                            fontWeight: key === "total" ? 600 : 400,
                            textAlign: "right",
                          }}
                        >
                          {val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sustainability Plan */}
              {memo.sustainabilityPlan && (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: "20px 24px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                    marginBottom: 16,
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginBottom: 8 }}>
                    Sustainability Plan
                  </p>
                  <p style={{ fontSize: 14, color: "#6E6E73", lineHeight: 1.6 }}>
                    {memo.sustainabilityPlan}
                  </p>
                </div>
              )}

              {/* Hostile Review */}
              {memo.hostileReview && memo.hostileReview.length > 0 && (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: "20px 24px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                    marginBottom: 16,
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginBottom: 12 }}>
                    Hostile Reviewer Simulation
                  </p>
                  {memo.hostileReview.map(
                    (item: { weakness: string; response: string }, i: number) => (
                      <div key={i} style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#FF3B30", marginBottom: 4 }}>
                          ⚠ Weakness {i + 1}: {item.weakness}
                        </p>
                        <p style={{ fontSize: 14, color: "#6E6E73" }}>
                          <strong style={{ color: "#34C759" }}>Response:</strong> {item.response}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Compliance Checklist */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: "20px 24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginBottom: 12 }}>
                  Compliance Checklist
                </p>
                {selected.checklist.map((item: string, i: number) => (
                  <label
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: i < selected.checklist.length - 1 ? "1px solid #F5F5F7" : "none",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checklist[item] || false}
                      onChange={() => toggleCheck(item)}
                      style={{ width: 16, height: 16, accentColor: "#34C759" }}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        color: checklist[item] ? "#8E8E93" : "#1D1D1F",
                        textDecoration: checklist[item] ? "line-through" : "none",
                      }}
                    >
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
