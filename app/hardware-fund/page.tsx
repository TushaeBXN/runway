"use client";

import { useEffect, useState } from "react";

interface Tier {
  id: string;
  label: string;
  description: string;
  target: number;
  color: string;
}

interface HardwareFundData {
  totalEarned: number;
  currentTier: string;
  currentTierData: Tier;
  nextTier: Tier | null;
  progressToNextTier: number;
  completedJobs: number;
  pendingJobs: number;
  weeklyEarnings: number;
  tiers: Tier[];
}

export default function HardwareFundPage() {
  const [data, setData] = useState<HardwareFundData | null>(null);

  useEffect(() => {
    fetch("/api/hardware-fund")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px" }}>
        <p style={{ color: "#8E8E93" }}>Loading…</p>
      </div>
    );
  }

  const amountToNext = data.nextTier
    ? Math.max(0, data.nextTier.target - data.totalEarned)
    : 0;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.5px" }}>
          Hardware Fund
        </h1>
        <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>
          Agents earn off-hours → upgrade their own hardware
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
        {[
          { label: "Total Earned", value: `$${data.totalEarned.toFixed(2)}`, color: "#34C759" },
          { label: "This Week", value: `$${data.weeklyEarnings.toFixed(2)}`, color: "#007AFF" },
          { label: "Jobs Done", value: String(data.completedJobs), color: "#1D1D1F" },
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

      {/* Next tier progress */}
      {data.nextTier && (
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
              marginBottom: 8,
            }}
          >
            Next Upgrade Target
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            {data.nextTier.label}
          </h2>
          <p style={{ color: "#A1A1A6", fontSize: 14, marginBottom: 16 }}>
            {data.nextTier.description}
          </p>

          {/* Progress bar */}
          <div
            style={{
              background: "rgba(255,255,255,0.12)",
              borderRadius: 8,
              height: 10,
              overflow: "hidden",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: `${data.progressToNextTier}%`,
                height: "100%",
                background: data.nextTier.color,
                borderRadius: 8,
                transition: "width 0.4s ease",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 13, color: "#A1A1A6" }}>
              ${data.totalEarned.toFixed(2)} / ${data.nextTier.target.toLocaleString()}
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: data.nextTier.color }}>
              {data.progressToNextTier}% — ${amountToNext.toFixed(2)} to go
            </p>
          </div>
        </div>
      )}

      {/* All tiers */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "20px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginBottom: 16 }}>
          Upgrade Path
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {data.tiers.map((tier, i) => {
            const isActive = tier.id === data.currentTier;
            const isCompleted =
              data.tiers.findIndex((t) => t.id === data.currentTier) > i;
            const progress =
              tier.target === 0
                ? 100
                : Math.min(100, Math.round((data.totalEarned / tier.target) * 100));

            return (
              <div key={tier.id} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                {/* Tier indicator */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: isCompleted || isActive ? tier.color : "#F5F5F7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    color: isCompleted || isActive ? "#fff" : "#8E8E93",
                    flexShrink: 0,
                  }}
                >
                  {isCompleted ? "✓" : i}
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "#1D1D1F" : isCompleted ? "#34C759" : "#6E6E73",
                      }}
                    >
                      {tier.label}
                      {isActive && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#007AFF",
                            background: "#007AFF18",
                            borderRadius: 6,
                            padding: "1px 6px",
                          }}
                        >
                          Current
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: 13, color: "#8E8E93" }}>
                      {tier.target === 0 ? "Baseline" : `$${tier.target.toLocaleString()}`}
                    </p>
                  </div>
                  <p style={{ fontSize: 12, color: "#8E8E93", marginBottom: 6 }}>{tier.description}</p>
                  {tier.target > 0 && (
                    <div
                      style={{
                        background: "#F5F5F7",
                        borderRadius: 4,
                        height: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${progress}%`,
                          height: "100%",
                          background: tier.color,
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
