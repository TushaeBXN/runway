"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";

const TIERS = [
  {
    key: "free",
    name: "Basic",
    price: "Free",
    period: "14-day trial",
    badge: null,
    badgeColor: null,
    color: "#6E6E73",
    accentBg: "#F5F5F7",
    cta: "Start Free Trial",
    ctaStyle: "outline",
    features: [
      "14-day free trial",
      "Up to 5 AI agents",
      "2 AI-powered tasks",
      "Email support",
      "Core dashboard",
      "Task & document management",
    ],
    notIncluded: [
      "Grant writer",
      "Board reports",
      "Custom workflows",
    ],
  },
  {
    key: "standard",
    name: "Standard",
    price: "$49",
    period: "/ month",
    badge: "Most Popular",
    badgeColor: "#007AFF",
    color: "#007AFF",
    accentBg: "rgba(0,122,255,0.06)",
    cta: "Get Started",
    ctaStyle: "filled",
    features: [
      "Everything in Basic",
      "Unlimited AI agents",
      "All AI-powered tasks",
      "Grant writer & board reports",
      "CRM, inbox & compliance tools",
      "Budget vs actuals",
      "Email + AI support",
      "Monthly board report emails",
    ],
    notIncluded: [
      "Dedicated onboarding",
      "Custom workflows",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$149",
    period: "/ quarter",
    badge: "Best Value",
    badgeColor: "#34C759",
    color: "#34C759",
    accentBg: "rgba(52,199,89,0.06)",
    cta: "Go Pro",
    ctaStyle: "filled",
    features: [
      "Everything in Standard",
      "Onboarding assistance",
      "Custom onboarding plan",
      "Advanced AI integrations",
      "Custom workflows",
      "Priority support",
      "Dedicated customer success manager",
      "Quarterly strategy check-ins",
    ],
    notIncluded: [],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "pricing",
    badge: null,
    badgeColor: null,
    color: "#5856D6",
    accentBg: "rgba(88,86,214,0.06)",
    cta: "Contact Us",
    ctaStyle: "outline",
    features: [
      "Everything in Pro",
      "Multi-tenancy support",
      "Custom integrations",
      "Advanced security & SSO",
      "Dedicated success team",
      "Custom onboarding & training",
      "SLA guarantees",
      "Volume pricing",
    ],
    notIncluded: [],
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCta(tierKey: string) {
    if (tierKey === "enterprise") {
      window.location.href = "mailto:hello@runway.ai?subject=Enterprise%20Inquiry";
      return;
    }
    if (tierKey === "free") {
      router.push(session ? "/dashboard" : "/register");
      return;
    }
    if (!session) {
      router.push(`/register?plan=${tierKey}`);
      return;
    }
    setLoading(tierKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierKey }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F7", paddingBottom: 80 }}>
      {/* Header */}
      <div
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          padding: "0 32px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Link href="/" style={{ fontWeight: 700, fontSize: 18, color: "#1D1D1F", textDecoration: "none", letterSpacing: "-0.3px" }}>
          Runway
        </Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {session ? (
            <Link href="/dashboard" style={{ fontSize: 14, color: "#007AFF", textDecoration: "none", fontWeight: 600 }}>
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" style={{ fontSize: 14, color: "#6E6E73", textDecoration: "none" }}>Sign In</Link>
              <Link
                href="/register"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  background: "#1D1D1F",
                  padding: "7px 16px",
                  borderRadius: 10,
                  textDecoration: "none",
                }}
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "64px 24px 48px" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#007AFF", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
          Pricing
        </p>
        <h1 style={{ fontSize: 48, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-1px", marginBottom: 16, lineHeight: 1.1 }}>
          Simple, transparent plans
        </h1>
        <p style={{ fontSize: 18, color: "#6E6E73", maxWidth: 540, margin: "0 auto" }}>
          Built for nonprofits of every size. Start free, scale as you grow.
          No hidden fees, no per-seat charges.
        </p>
      </div>

      {/* Tier cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        {TIERS.map((tier) => (
          <div
            key={tier.key}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 28,
              boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
              border: `1.5px solid ${tier.key === "standard" ? tier.color : "rgba(0,0,0,0.06)"}`,
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top accent bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: tier.color,
                borderRadius: "20px 20px 0 0",
              }}
            />

            {/* Badge */}
            {tier.badge && (
              <div
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  background: tier.badgeColor!,
                  padding: "3px 10px",
                  borderRadius: 6,
                  marginBottom: 12,
                  alignSelf: "flex-start",
                  letterSpacing: 0.3,
                }}
              >
                {tier.badge}
              </div>
            )}

            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1D1D1F", marginBottom: 4 }}>{tier.name}</h2>

            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-1px" }}>{tier.price}</span>
              <span style={{ fontSize: 14, color: "#6E6E73" }}>{tier.period}</span>
            </div>

            {tier.key === "pro" && (
              <p style={{ fontSize: 12, color: "#6E6E73", marginBottom: 8 }}>~$49.67/month, billed quarterly</p>
            )}

            <div style={{ borderTop: "1px solid #F0F0F0", margin: "16px 0" }} />

            {/* Features */}
            <div style={{ flex: 1 }}>
              {tier.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: tier.color, fontSize: 15, lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
              {tier.notIncluded.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: "#C7C7CC", fontSize: 15, lineHeight: 1.4, flexShrink: 0 }}>✗</span>
                  <span style={{ fontSize: 14, color: "#C7C7CC", lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => handleCta(tier.key)}
              disabled={loading === tier.key}
              style={{
                marginTop: 24,
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: loading === tier.key ? "not-allowed" : "pointer",
                border: tier.ctaStyle === "outline" ? `1.5px solid ${tier.color}` : "none",
                background:
                  loading === tier.key
                    ? "#8E8E93"
                    : tier.ctaStyle === "filled"
                    ? tier.color
                    : "transparent",
                color: tier.ctaStyle === "filled" ? "#fff" : tier.color,
                transition: "opacity 0.15s",
              }}
            >
              {loading === tier.key ? "Redirecting…" : tier.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p style={{ textAlign: "center", fontSize: 13, color: "#8E8E93", marginTop: 40 }}>
        All plans include a 14-day free trial. No credit card required to start.
        Cancel anytime.
      </p>

      {/* FAQ strip */}
      <div style={{ maxWidth: 680, margin: "48px auto 0", padding: "0 24px" }}>
        <h3 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F", marginBottom: 24, textAlign: "center" }}>
          Common questions
        </h3>
        {[
          {
            q: "Can I switch plans later?",
            a: "Yes. Upgrade or downgrade at any time from your Settings page. Changes take effect at the next billing cycle.",
          },
          {
            q: "Is there a discount for annual billing?",
            a: "The Pro plan already locks in a lower monthly rate when billed quarterly. Annual billing discounts are available for Enterprise — contact us.",
          },
          {
            q: "What counts as an AI agent?",
            a: "Agents are autonomous workers you deploy (grant writer, inbox triage, social scheduler, etc.). Standard and Pro have no agent limit.",
          },
          {
            q: "Do you offer nonprofit discounts?",
            a: "Every plan is already built for nonprofits. If you're a very small org or fiscally sponsored project, contact us — we'll work something out.",
          },
        ].map(({ q, a }) => (
          <div key={q} style={{ marginBottom: 20, padding: "20px 24px", background: "#fff", borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F", marginBottom: 6 }}>{q}</p>
            <p style={{ fontSize: 14, color: "#6E6E73", lineHeight: 1.5 }}>{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
