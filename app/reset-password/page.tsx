"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setError("Missing reset token. Please use the link from your email.");
  }, [token]);

  const mismatch = confirm.length > 0 && password !== confirm;
  const weak = password.length > 0 && password.length < 8;
  const canSubmit = token && password.length >= 8 && password === confirm && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.ok) {
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } else {
      setError(data.error || "Something went wrong. Please try again.");
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: "1.5px solid #E5E5EA",
    fontSize: 15,
    color: "#1D1D1F",
    outline: "none",
    background: "#FAFAFA",
    boxSizing: "border-box" as const,
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

        {done ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                background: "#34C75911",
                border: "1.5px solid #34C75933",
                borderRadius: 14,
                padding: "28px 20px",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: "0 0 8px" }}>
                Password updated
              </h2>
              <p style={{ fontSize: 14, color: "#3C3C43", lineHeight: 1.6, margin: 0 }}>
                Your password has been changed. Redirecting you to sign in…
              </p>
            </div>
            <Link href="/login" style={{ fontSize: 14, color: "#007AFF", textDecoration: "none", fontWeight: 600 }}>
              Sign in now →
            </Link>
          </div>
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
              Set a new password
            </h1>
            <p style={{ fontSize: 14, color: "#6E6E73", textAlign: "center", marginBottom: 28 }}>
              Choose a strong password — at least 8 characters.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginBottom: 6 }}>
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="Min. 8 characters"
                  style={{ ...inputStyle, borderColor: weak ? "#FF9500" : "#E5E5EA" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1D1D1F")}
                  onBlur={(e) => (e.target.style.borderColor = weak ? "#FF9500" : "#E5E5EA")}
                />
                {weak && (
                  <p style={{ fontSize: 12, color: "#FF9500", margin: "5px 0 0" }}>
                    Password must be at least 8 characters
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginBottom: 6 }}>
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Repeat your password"
                  style={{ ...inputStyle, borderColor: mismatch ? "#FF3B30" : "#E5E5EA" }}
                  onFocus={(e) => (e.target.style.borderColor = mismatch ? "#FF3B30" : "#1D1D1F")}
                  onBlur={(e) => (e.target.style.borderColor = mismatch ? "#FF3B30" : "#E5E5EA")}
                />
                {mismatch && (
                  <p style={{ fontSize: 12, color: "#FF3B30", margin: "5px 0 0" }}>
                    Passwords don&apos;t match
                  </p>
                )}
              </div>

              {/* Strength indicator */}
              {password.length > 0 && (
                <div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[8, 12, 16].map((threshold, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          background:
                            password.length >= threshold
                              ? i === 0 ? "#FF9500" : i === 1 ? "#FFCC00" : "#34C759"
                              : "#E5E5EA",
                          transition: "background 0.2s",
                        }}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: "#8E8E93", margin: 0 }}>
                    {password.length < 8 ? "Too short" : password.length < 12 ? "Acceptable" : password.length < 16 ? "Good" : "Strong"}
                  </p>
                </div>
              )}

              {error && (
                <div
                  style={{
                    background: "rgba(255,59,48,0.08)",
                    border: "1px solid rgba(255,59,48,0.2)",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <p style={{ fontSize: 13, color: "#FF3B30", margin: 0 }}>{error}</p>
                  {error.includes("expired") && (
                    <Link
                      href="/forgot-password"
                      style={{ fontSize: 13, color: "#007AFF", textDecoration: "none", fontWeight: 600, display: "block", marginTop: 6 }}
                    >
                      Request a new link →
                    </Link>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  background: !canSubmit ? "#8E8E93" : "#1D1D1F",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "13px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: !canSubmit ? "not-allowed" : "pointer",
                  marginTop: 4,
                  transition: "background 0.15s",
                }}
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          </>
        )}

        {!done && (
          <p style={{ textAlign: "center", fontSize: 14, color: "#6E6E73", marginTop: 24 }}>
            <Link href="/login" style={{ color: "#1D1D1F", fontWeight: 600, textDecoration: "none" }}>
              ← Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#8E8E93", fontSize: 14 }}>Loading…</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
