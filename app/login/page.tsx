"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password.");
    } else {
      // Fetch session to check hasOrgProfile
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const hasOrgProfile = (session?.user as { hasOrgProfile?: boolean })?.hasOrgProfile;
      router.push(hasOrgProfile ? "/dashboard" : "/onboarding");
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
          padding: "40px 40px",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#1D1D1F",
              letterSpacing: "-0.5px",
            }}
          >
            Runway
          </span>
          <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 6 }}>
            AI agent platform for nonprofits
          </p>
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1D1D1F",
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          Sign in to your account
        </h1>

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
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1D1D1F")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E5EA")}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>
              Password
            </label>
            <Link href="/forgot-password" style={{ fontSize: 12, color: "#007AFF", textDecoration: "none" }}>
              Forgot password?
            </Link>
          </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 10,
                border: "1.5px solid #E5E5EA",
                fontSize: 15,
                color: "#1D1D1F",
                outline: "none",
                background: "#FAFAFA",
                transition: "border-color 0.15s",
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
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#8E8E93" : "#1D1D1F",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "13px",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
              transition: "background 0.15s",
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            fontSize: 14,
            color: "#6E6E73",
            marginTop: 24,
          }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            style={{ color: "#1D1D1F", fontWeight: 600, textDecoration: "none" }}
          >
            Start free trial
          </Link>
        </p>
      </div>
    </div>
  );
}
