"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.ok) {
      setSent(true);
    } else {
      setError(data.error || "Something went wrong. Please try again.");
    }
  }

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
          padding: "40px",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.5px" }}>
            Runway
          </span>
          <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 6 }}>
            AI agent platform for nonprofits
          </p>
        </div>

        {sent ? (
          <>
            <div
              style={{
                textAlign: "center",
                background: "#34C75911",
                border: "1.5px solid #34C75933",
                borderRadius: 14,
                padding: "24px 20px",
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: "0 0 8px" }}>
                Check your email
              </h2>
              <p style={{ fontSize: 14, color: "#3C3C43", lineHeight: 1.6, margin: 0 }}>
                If <strong>{email}</strong> is registered, you&apos;ll receive a password reset link
                within a minute. The link expires in 1 hour.
              </p>
            </div>
            <p style={{ fontSize: 13, color: "#8E8E93", textAlign: "center", margin: "0 0 16px" }}>
              Didn&apos;t get it? Check your spam folder, or{" "}
              <button
                onClick={() => setSent(false)}
                style={{ background: "none", border: "none", color: "#007AFF", fontSize: 13, cursor: "pointer", padding: 0 }}
              >
                try again
              </button>
              .
            </p>
          </>
        ) : (
          <>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#1D1D1F",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Forgot your password?
            </h1>
            <p style={{ fontSize: 14, color: "#6E6E73", textAlign: "center", marginBottom: 28, lineHeight: 1.5 }}>
              Enter the email address on your account and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1D1D1F",
                    marginBottom: 6,
                  }}
                >
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@nonprofit.org"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: "1.5px solid #E5E5EA",
                    fontSize: 15,
                    color: "#1D1D1F",
                    outline: "none",
                    background: "#FAFAFA",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#1D1D1F")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E5EA")}
                />
              </div>

              {error && (
                <p
                  style={{
                    color: "#FF3B30",
                    fontSize: 13,
                    background: "rgba(255,59,48,0.08)",
                    padding: "10px 14px",
                    borderRadius: 8,
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  background: loading || !email ? "#8E8E93" : "#1D1D1F",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "13px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading || !email ? "not-allowed" : "pointer",
                  marginTop: 4,
                }}
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 14, color: "#6E6E73", marginTop: 24 }}>
          <Link href="/login" style={{ color: "#1D1D1F", fontWeight: 600, textDecoration: "none" }}>
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
