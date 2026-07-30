"use client";

import Link from "next/link";
import { useState } from "react";

const agents = [
  {
    icon: "🧭",
    name: "CEO Agent",
    description:
      "Synthesizes everything into a daily executive brief. Tracks org health, flags risks, and surfaces decisions that need your attention.",
  },
  {
    icon: "📢",
    name: "Marketing Agent",
    description:
      "Drafts social posts, newsletters, and campaign copy tailored to your mission. Keeps your voice consistent across every channel.",
  },
  {
    icon: "💻",
    name: "Dev Agent",
    description:
      "Monitors your tech stack, drafts tickets, and suggests improvements. Keeps your digital infrastructure healthy without a full-time engineer.",
  },
  {
    icon: "📬",
    name: "Inbox Agent",
    description:
      "Triages email, drafts replies, and flags urgent messages. Cuts through the noise so you only touch what truly needs you.",
  },
  {
    icon: "📋",
    name: "Grant Architect",
    description:
      "Researches grant opportunities, scores them for mission fit, and drafts application outlines — complete with budgets and KPIs.",
  },
];

const freeFeatures = [
  "5 AI agents included",
  "14-day free trial",
  "Morning report emails",
  "Grant opportunity research",
  "Chat with your agents",
];

const proFeatures = [
  "All 5 AI agents, always on",
  "Nightly automated runs",
  "Priority Claude AI access",
  "Stripe billing management",
  "Unlimited grant research",
  "Email morning reports",
  "Cancel anytime",
];

export default function LandingPage() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  async function handleGetPro() {
    setCheckoutLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const json = await res.json();
    if (json.url) {
      window.location.href = json.url;
    } else if (json.error === "Unauthorized") {
      window.location.href = "/register";
    } else {
      alert("Unable to start checkout. Please try again.");
      setCheckoutLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" }}>

      {/* ── NAV ───────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          background: "rgba(29,29,31,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 20,
            color: "#fff",
            letterSpacing: "-0.4px",
          }}
        >
          Runway
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/pricing"
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "rgba(255,255,255,0.7)",
              textDecoration: "none",
              padding: "7px 14px",
              borderRadius: 8,
            }}
          >
            Pricing
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "rgba(255,255,255,0.7)",
              textDecoration: "none",
              padding: "7px 14px",
              borderRadius: 8,
            }}
          >
            Login
          </Link>
          <Link
            href="/register"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              textDecoration: "none",
              padding: "8px 18px",
              borderRadius: 10,
              background: "#1D1D1F",
              border: "1.5px solid rgba(255,255,255,0.2)",
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section
        style={{
          background: "#1D1D1F",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "120px 24px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle radial gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(52,199,89,0.10) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(52,199,89,0.12)",
            border: "1px solid rgba(52,199,89,0.3)",
            borderRadius: 20,
            padding: "5px 14px",
            marginBottom: 32,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34C759", display: "inline-block" }} />
          <span style={{ fontSize: 13, color: "#34C759", fontWeight: 600 }}>Powered by Claude AI</span>
        </div>

        <h1
          style={{
            fontSize: "clamp(42px, 7vw, 80px)",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-2px",
            lineHeight: 1.05,
            maxWidth: 780,
            marginBottom: 24,
          }}
        >
          Your nonprofit,
          <br />
          <span style={{ color: "#34C759" }}>on autopilot.</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "rgba(255,255,255,0.65)",
            maxWidth: 600,
            lineHeight: 1.6,
            marginBottom: 40,
          }}
        >
          Runway deploys AI agents that handle grant research, marketing, communications, and strategy — so you can focus on your mission.
        </p>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/register"
            style={{
              display: "inline-block",
              background: "#34C759",
              color: "#fff",
              textDecoration: "none",
              padding: "15px 32px",
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.2px",
              boxShadow: "0 4px 20px rgba(52,199,89,0.35)",
            }}
          >
            Start Free Trial
          </Link>
          <a
            href="#features"
            style={{
              display: "inline-block",
              color: "rgba(255,255,255,0.75)",
              textDecoration: "none",
              padding: "15px 32px",
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 600,
              border: "1.5px solid rgba(255,255,255,0.15)",
            }}
          >
            See how it works
          </a>
        </div>

        {/* Scroll indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.25)",
            fontSize: 22,
          }}
        >
          ↓
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ──────────────────────────────── */}
      <section
        style={{
          background: "#F5F5F7",
          padding: "18px 24px",
          textAlign: "center",
          borderBottom: "1px solid #E5E5EA",
        }}
      >
        <p style={{ fontSize: 13, color: "#8E8E93", letterSpacing: 0.3 }}>
          Powered by Claude AI &nbsp;·&nbsp; No database setup &nbsp;·&nbsp; Cancel anytime &nbsp;·&nbsp; 14-day free trial
        </p>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section
        id="features"
        style={{
          background: "#fff",
          padding: "96px 24px",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#34C759",
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 12,
              }}
            >
              What Runway does
            </p>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 800,
                color: "#1D1D1F",
                letterSpacing: "-1px",
              }}
            >
              Five agents. One mission.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "#6E6E73",
                marginTop: 12,
                maxWidth: 480,
                margin: "12px auto 0",
              }}
            >
              Each agent specializes in a critical function — and they work together to keep your org running.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {agents.map((agent) => (
              <div
                key={agent.name}
                style={{
                  background: "#F5F5F7",
                  borderRadius: 20,
                  padding: "28px 24px",
                  border: "1px solid transparent",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#E5E5EA";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "transparent";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    marginBottom: 16,
                    width: 56,
                    height: 56,
                    background: "#fff",
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                  }}
                >
                  {agent.icon}
                </div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#1D1D1F",
                    marginBottom: 8,
                    letterSpacing: "-0.2px",
                  }}
                >
                  {agent.name}
                </h3>
                <p style={{ fontSize: 14, color: "#6E6E73", lineHeight: 1.6 }}>
                  {agent.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section
        style={{
          background: "#F5F5F7",
          padding: "96px 24px",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#34C759",
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 12,
              }}
            >
              How it works
            </p>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 800,
                color: "#1D1D1F",
                letterSpacing: "-1px",
              }}
            >
              Set it up once. Run forever.
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 0,
              position: "relative",
            }}
          >
            {[
              {
                step: "1",
                title: "Set up your org profile",
                desc: "Tell Runway about your nonprofit — mission, focus areas, and goals. Takes 3 minutes.",
              },
              {
                step: "2",
                title: "Agents run nightly",
                desc: "Every night, your five agents automatically research, write, and analyze on your behalf.",
              },
              {
                step: "3",
                title: "Wake up to a morning report",
                desc: "Every morning you get a complete executive brief with everything your agents found and did.",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  padding: "32px 28px",
                  margin: 8,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "#1D1D1F",
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  {item.step}
                </div>
                {i < 2 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 54,
                      right: -28,
                      fontSize: 20,
                      color: "#C7C7CC",
                      zIndex: 1,
                    }}
                  >
                    →
                  </div>
                )}
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#1D1D1F",
                    marginBottom: 8,
                    letterSpacing: "-0.2px",
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ fontSize: 14, color: "#6E6E73", lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────── */}
      <section
        id="pricing"
        style={{
          background: "#fff",
          padding: "96px 24px",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#34C759",
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 12,
              }}
            >
              Pricing
            </p>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 800,
                color: "#1D1D1F",
                letterSpacing: "-1px",
              }}
            >
              Simple, nonprofit-friendly pricing.
            </h2>
            <p style={{ fontSize: 16, color: "#6E6E73", marginTop: 12 }}>
              Start free. Upgrade when you&apos;re ready.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 24,
              alignItems: "start",
            }}
          >
            {/* Free Trial Card */}
            <div
              style={{
                background: "#F5F5F7",
                borderRadius: 24,
                padding: "36px 32px",
                border: "2px solid #E5E5EA",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: "#6E6E73", marginBottom: 8 }}>
                Free Trial
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 44, fontWeight: 800, color: "#1D1D1F", letterSpacing: "-2px" }}>
                  $0
                </span>
                <span style={{ fontSize: 14, color: "#8E8E93" }}>for 14 days</span>
              </div>
              <p style={{ fontSize: 13, color: "#8E8E93", marginBottom: 28 }}>
                Then $29/month. Cancel anytime.
              </p>

              <ul style={{ listStyle: "none", padding: 0, marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
                {freeFeatures.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#1D1D1F" }}>
                    <span style={{ color: "#34C759", fontWeight: 700, fontSize: 16 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                style={{
                  display: "block",
                  textAlign: "center",
                  background: "#1D1D1F",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "14px",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Start Free Trial
              </Link>
            </div>

            {/* Pro Card */}
            <div
              style={{
                background: "#1D1D1F",
                borderRadius: 24,
                padding: "36px 32px",
                border: "2px solid #34C759",
                position: "relative",
              }}
            >
              {/* Badge */}
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#34C759",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "4px 16px",
                  borderRadius: 20,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                Most Popular
              </div>

              <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                Pro
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 44, fontWeight: 800, color: "#fff", letterSpacing: "-2px" }}>
                  $29
                </span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>/month</span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>
                Everything you need to run on autopilot.
              </p>

              <ul style={{ listStyle: "none", padding: 0, marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
                {proFeatures.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.85)" }}>
                    <span style={{ color: "#34C759", fontWeight: 700, fontSize: 16 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleGetPro}
                disabled={checkoutLoading}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "center",
                  background: checkoutLoading ? "rgba(52,199,89,0.5)" : "#34C759",
                  color: "#fff",
                  border: "none",
                  padding: "14px",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: checkoutLoading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 16px rgba(52,199,89,0.4)",
                }}
              >
                {checkoutLoading ? "Loading…" : "Get Pro"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer
        style={{
          background: "#1D1D1F",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
          Runway &copy; 2026 &nbsp;·&nbsp; Built with Claude AI &nbsp;·&nbsp;{" "}
          <Link href="/login" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
            Login
          </Link>
          {" "}&nbsp;·&nbsp;{" "}
          <Link href="/register" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
            Sign Up
          </Link>
        </p>
      </footer>
    </div>
  );
}
