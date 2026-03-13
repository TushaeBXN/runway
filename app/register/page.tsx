"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed.");
      setLoading(false);
      return;
    }

    // Sign in after registration
    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (signInRes?.error) {
      setError("Account created but sign-in failed. Please try logging in.");
    } else {
      router.push("/onboarding");
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
            14-day free trial · No credit card required
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
          Create your account
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
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
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
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#1D1D1F",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 8 characters"
              minLength={8}
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
              background: loading ? "#8E8E93" : "#34C759",
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
            {loading ? "Creating account…" : "Start Free Trial"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "#8E8E93",
            marginTop: 16,
          }}
        >
          By signing up, you agree to our Terms of Service.
        </p>

        <p
          style={{
            textAlign: "center",
            fontSize: 14,
            color: "#6E6E73",
            marginTop: 16,
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: "#1D1D1F", fontWeight: 600, textDecoration: "none" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
