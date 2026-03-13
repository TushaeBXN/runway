"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface OrgProfile {
  orgName: string;
  location: string;
  mission: string;
  focusAreas: string;
  website?: string;
}

interface SubscriptionData {
  status: string;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  stripePriceId?: string;
}

interface AISettings {
  llmProvider: string;
  anthropicKeyLast4: string | null;
  ollamaHost: string;
  ollamaModel: string;
}

interface SettingsData {
  orgProfile: OrgProfile | null;
  subscription: SubscriptionData | null;
  aiSettings: AISettings | null;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "24px 28px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "#8E8E93",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 16,
      }}
    >
      {children}
    </p>
  );
}

function SettingsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SettingsData | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const upgraded = searchParams.get("upgraded") === "true";

  // AI Model form state
  const [llmProvider, setLlmProvider] = useState<"anthropic" | "ollama">("anthropic");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [ollamaHost, setOllamaHost] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((d: SettingsData) => {
          setData(d);
          if (d.aiSettings) {
            setLlmProvider((d.aiSettings.llmProvider as "anthropic" | "ollama") || "anthropic");
            setOllamaHost(d.aiSettings.ollamaHost || "http://localhost:11434");
            setOllamaModel(d.aiSettings.ollamaModel || "llama3.2");
          }
        })
        .catch(() => null);
    }
  }, [status, router]);

  async function handleManageSubscription() {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const json = await res.json();
    setPortalLoading(false);
    if (json.url) window.location.href = json.url;
    else alert("Could not open billing portal. Please contact support.");
  }

  async function handleSaveAI(e: React.FormEvent) {
    e.preventDefault();
    setAiSaving(true);
    setAiSaved(false);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llmProvider, anthropicKey, ollamaHost, ollamaModel }),
      });
      setAiSaved(true);
      setAnthropicKey(""); // clear after save
      // Refresh settings to show updated key mask
      const updated = await fetch("/api/settings").then((r) => r.json());
      setData(updated);
      setTimeout(() => setAiSaved(false), 3000);
    } finally {
      setAiSaving(false);
    }
  }

  if (status === "loading" || !data) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 48px" }}>
        <p style={{ color: "#8E8E93" }}>Loading…</p>
      </div>
    );
  }

  const focusAreas: string[] = data.orgProfile?.focusAreas
    ? JSON.parse(data.orgProfile.focusAreas)
    : [];

  const subStatus = data.subscription?.status ?? "none";
  const isTrialing = subStatus === "trialing";
  const isActive = subStatus === "active";
  const trialEnd = data.subscription?.trialEndsAt
    ? new Date(data.subscription.trialEndsAt)
    : null;
  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const keyPlaceholder = data.aiSettings?.anthropicKeyLast4
    ? `••••••••••••••••${data.aiSettings.anthropicKeyLast4}`
    : "sk-ant-...";

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 48px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.5px" }}>
          Settings
        </h1>
        <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>
          Manage your account, AI model, and organization profile.
        </p>
      </div>

      {upgraded && (
        <div
          style={{
            background: "#34C759",
            borderRadius: 12,
            padding: "14px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>🎉</span>
          <p style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
            Welcome to Runway Pro! Your subscription is active.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* AI Model Settings */}
        <Card>
          <SectionLabel>AI Model</SectionLabel>
          <form onSubmit={handleSaveAI} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Provider radio buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              {(["anthropic", "ollama"] as const).map((p) => (
                <label
                  key={p}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "14px 16px",
                    border: `2px solid ${llmProvider === p ? "#1D1D1F" : "#E5E5EA"}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    background: llmProvider === p ? "#F5F5F7" : "#fff",
                    transition: "all 0.15s",
                  }}
                >
                  <input
                    type="radio"
                    name="llmProvider"
                    value={p}
                    checked={llmProvider === p}
                    onChange={() => setLlmProvider(p)}
                    style={{ accentColor: "#1D1D1F" }}
                  />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>
                      {p === "anthropic" ? "◆ Anthropic Claude" : "⬡ Ollama (Local)"}
                    </p>
                    <p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0" }}>
                      {p === "anthropic" ? "Cloud AI — fast and powerful" : "Runs locally — private"}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Anthropic key input */}
            {llmProvider === "anthropic" && (
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#6E6E73",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  API Key
                </label>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder={keyPlaceholder}
                  autoComplete="new-password"
                  style={{
                    width: "100%",
                    border: "1.5px solid #E5E5EA",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 14,
                    color: "#1D1D1F",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "monospace",
                  }}
                />
                {data.aiSettings?.anthropicKeyLast4 && (
                  <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 6 }}>
                    Current key ends in <strong>…{data.aiSettings.anthropicKeyLast4}</strong>. Leave blank to keep it.
                  </p>
                )}
              </div>
            )}

            {/* Ollama fields */}
            {llmProvider === "ollama" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6E6E73",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Ollama Host
                  </label>
                  <input
                    type="text"
                    value={ollamaHost}
                    onChange={(e) => setOllamaHost(e.target.value)}
                    placeholder="http://localhost:11434"
                    style={{
                      width: "100%",
                      border: "1.5px solid #E5E5EA",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontSize: 14,
                      color: "#1D1D1F",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6E6E73",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="llama3.2"
                    style={{
                      width: "100%",
                      border: "1.5px solid #E5E5EA",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontSize: 14,
                      color: "#1D1D1F",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="submit"
                disabled={aiSaving}
                style={{
                  background: aiSaving ? "#E5E5EA" : "#1D1D1F",
                  color: aiSaving ? "#8E8E93" : "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: aiSaving ? "not-allowed" : "pointer",
                }}
              >
                {aiSaving ? "Saving…" : "Save AI Settings"}
              </button>
              {aiSaved && (
                <span style={{ fontSize: 13, color: "#34C759", fontWeight: 600 }}>
                  Saved!
                </span>
              )}
            </div>
          </form>
        </Card>

        {/* Account info */}
        <Card>
          <SectionLabel>Account</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <p style={{ fontSize: 12, color: "#8E8E93" }}>Name</p>
              <p style={{ fontSize: 15, color: "#1D1D1F", fontWeight: 500 }}>
                {session?.user?.name || "—"}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: "#8E8E93" }}>Email</p>
              <p style={{ fontSize: 15, color: "#1D1D1F", fontWeight: 500 }}>
                {session?.user?.email || "—"}
              </p>
            </div>
          </div>
        </Card>

        {/* Subscription */}
        <Card>
          <SectionLabel>Subscription</SectionLabel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span
                  style={{
                    display: "inline-block",
                    background: isActive ? "#34C759" : isTrialing ? "#FF9500" : "#8E8E93",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 20,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {isActive ? "Pro" : isTrialing ? "Trial" : subStatus}
                </span>
              </div>
              {isTrialing && trialEnd && (
                <p style={{ fontSize: 14, color: "#6E6E73" }}>
                  {trialDaysLeft > 0
                    ? `${trialDaysLeft} days remaining in your trial`
                    : "Trial expired"}
                </p>
              )}
              {isActive && data.subscription?.currentPeriodEnd && (
                <p style={{ fontSize: 14, color: "#6E6E73" }}>
                  Renews{" "}
                  {new Date(data.subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
              {!isActive && !isTrialing && (
                <p style={{ fontSize: 14, color: "#6E6E73" }}>No active subscription</p>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {!isActive && (
                <button
                  onClick={async () => {
                    const res = await fetch("/api/stripe/checkout", { method: "POST" });
                    const json = await res.json();
                    if (json.url) window.location.href = json.url;
                  }}
                  style={{
                    background: "#34C759",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 18px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Upgrade to Pro
                </button>
              )}
              {isActive && (
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  style={{
                    background: portalLoading ? "#E5E5EA" : "#1D1D1F",
                    color: portalLoading ? "#8E8E93" : "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 18px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: portalLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {portalLoading ? "Loading…" : "Manage Subscription"}
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Org Profile */}
        {data.orgProfile ? (
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <SectionLabel>Organization Profile</SectionLabel>
              <a
                href="/onboarding"
                style={{
                  fontSize: 13,
                  color: "#1D1D1F",
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "6px 14px",
                  border: "1.5px solid #E5E5EA",
                  borderRadius: 8,
                }}
              >
                Edit
              </a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <p style={{ fontSize: 12, color: "#8E8E93" }}>Organization</p>
                <p style={{ fontSize: 15, color: "#1D1D1F", fontWeight: 500 }}>
                  {data.orgProfile.orgName}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: "#8E8E93" }}>Location</p>
                <p style={{ fontSize: 15, color: "#1D1D1F", fontWeight: 500 }}>
                  {data.orgProfile.location}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: "#8E8E93" }}>Mission</p>
                <p style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.5 }}>
                  {data.orgProfile.mission}
                </p>
              </div>
              {focusAreas.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, color: "#8E8E93", marginBottom: 6 }}>Focus Areas</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {focusAreas.map((area) => (
                      <span
                        key={area}
                        style={{
                          background: "#F0F0F0",
                          color: "#1D1D1F",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {data.orgProfile.website && (
                <div>
                  <p style={{ fontSize: 12, color: "#8E8E93" }}>Website</p>
                  <a
                    href={data.orgProfile.website}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 14, color: "#1D1D1F", fontWeight: 500 }}
                  >
                    {data.orgProfile.website}
                  </a>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <p style={{ color: "#8E8E93", fontSize: 14, marginBottom: 12 }}>
              You haven&apos;t set up your organization profile yet.
            </p>
            <a
              href="/onboarding"
              style={{
                display: "inline-block",
                background: "#1D1D1F",
                color: "#fff",
                borderRadius: 10,
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Set up org profile
            </a>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "#8E8E93" }}>Loading…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
