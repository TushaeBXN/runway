"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FOCUS_AREAS = [
  "Cybersecurity Training",
  "AI Literacy",
  "STEM Education",
  "Workforce Development",
  "Digital Equity",
  "Youth Programs",
  "Adult Learners",
  "K-12 Education",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [location, setLocation] = useState("");
  const [mission, setMission] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleFocusArea(area: string) {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  async function handleFinish() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgName, location, mission, focusAreas, website }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Failed to save. Please try again.");
      return;
    }
    router.push("/dashboard");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: "1.5px solid #E5E5EA",
    fontSize: 15,
    color: "#1D1D1F",
    outline: "none",
    background: "#FAFAFA",
    transition: "border-color 0.15s",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#1D1D1F",
    marginBottom: 6,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F5F7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: "40px 40px",
          width: "100%",
          maxWidth: 520,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link
            href="/"
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#1D1D1F",
              letterSpacing: "-0.5px",
              textDecoration: "none",
            }}
          >
            Runway
          </Link>
        </div>

        {/* Progress indicator */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <p style={{ fontSize: 13, color: "#8E8E93" }}>Step {step} of 3</p>
            <p style={{ fontSize: 13, color: "#8E8E93" }}>
              {step === 1 ? "Organization" : step === 2 ? "Mission" : "Confirm"}
            </p>
          </div>
          <div
            style={{
              height: 4,
              background: "#F0F0F0",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(step / 3) * 100}%`,
                background: "#34C759",
                borderRadius: 2,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Step 1: Org Name + Location */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F" }}>
              Tell us about your organization
            </h2>
            <div>
              <label style={labelStyle}>Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. TechBridge Foundation"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#1D1D1F")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E5EA")}
              />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Atlanta, GA"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#1D1D1F")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E5EA")}
              />
            </div>
            <button
              onClick={() => step === 1 && orgName && location && setStep(2)}
              disabled={!orgName || !location}
              style={{
                background: !orgName || !location ? "#E5E5EA" : "#1D1D1F",
                color: !orgName || !location ? "#8E8E93" : "#fff",
                border: "none",
                borderRadius: 12,
                padding: "13px",
                fontSize: 15,
                fontWeight: 600,
                cursor: !orgName || !location ? "not-allowed" : "pointer",
                marginTop: 4,
                transition: "all 0.15s",
              }}
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 2: Mission + Focus Areas */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F" }}>
              Your mission &amp; focus
            </h2>
            <div>
              <label style={labelStyle}>Mission Statement</label>
              <textarea
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                placeholder="What is your organization's core mission?"
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: 80,
                }}
                onFocus={(e) => (e.target.style.borderColor = "#1D1D1F")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E5EA")}
              />
            </div>
            <div>
              <label style={labelStyle}>Focus Areas (select all that apply)</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                {FOCUS_AREAS.map((area) => {
                  const selected = focusAreas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleFocusArea(area)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: selected ? "2px solid #1D1D1F" : "2px solid #E5E5EA",
                        background: selected ? "#1D1D1F" : "#FAFAFA",
                        color: selected ? "#fff" : "#1D1D1F",
                        fontSize: 13,
                        fontWeight: selected ? 600 : 400,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      {selected ? "✓ " : ""}{area}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  background: "transparent",
                  color: "#6E6E73",
                  border: "1.5px solid #E5E5EA",
                  borderRadius: 12,
                  padding: "13px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => mission && focusAreas.length > 0 && setStep(3)}
                disabled={!mission || focusAreas.length === 0}
                style={{
                  flex: 2,
                  background: !mission || focusAreas.length === 0 ? "#E5E5EA" : "#1D1D1F",
                  color: !mission || focusAreas.length === 0 ? "#8E8E93" : "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "13px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: !mission || focusAreas.length === 0 ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Website + Confirm */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F" }}>
              Almost there!
            </h2>

            <div>
              <label style={labelStyle}>Website (optional)</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourorg.org"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#1D1D1F")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E5EA")}
              />
            </div>

            {/* Summary */}
            <div
              style={{
                background: "#F5F5F7",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginBottom: 4 }}>
                Review your details
              </p>
              <div>
                <span style={{ fontSize: 12, color: "#8E8E93" }}>Organization</span>
                <p style={{ fontSize: 14, color: "#1D1D1F", fontWeight: 500 }}>{orgName}</p>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "#8E8E93" }}>Location</span>
                <p style={{ fontSize: 14, color: "#1D1D1F", fontWeight: 500 }}>{location}</p>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "#8E8E93" }}>Mission</span>
                <p style={{ fontSize: 14, color: "#1D1D1F", fontWeight: 500, lineHeight: 1.4 }}>{mission}</p>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "#8E8E93" }}>Focus Areas</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {focusAreas.map((area) => (
                    <span
                      key={area}
                      style={{
                        background: "#1D1D1F",
                        color: "#fff",
                        borderRadius: 6,
                        padding: "3px 8px",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p
                style={{
                  color: "#FF3B30",
                  fontSize: 13,
                  background: "rgba(255,59,48,0.08)",
                  padding: "10px 14px",
                  borderRadius: 8,
                }}
              >
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  flex: 1,
                  background: "transparent",
                  color: "#6E6E73",
                  border: "1.5px solid #E5E5EA",
                  borderRadius: 12,
                  padding: "13px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                style={{
                  flex: 2,
                  background: loading ? "#8E8E93" : "#34C759",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "13px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {loading ? "Saving…" : "Launch Runway →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
