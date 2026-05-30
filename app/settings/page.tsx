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
  openaiKeyLast4: string | null;
  geminiKeyLast4: string | null;
  ollamaHost: string;
  ollamaModel: string;
  useLocalForSimple?: boolean;
  useCloudForComplex?: boolean;
  scheduleConfig?: {
    businessStartHour: number; businessStartMin: number;
    businessEndHour: number; businessEndMin: number;
    businessDays: number[];
    offHoursStartHour: number; offHoursStartMin: number;
    offHoursRunWeekends: boolean;
    coolDownMinutes: number;
  } | null;
}

interface SettingsData {
  orgProfile: OrgProfile | null;
  subscription: SubscriptionData | null;
  aiSettings: AISettings | null;
}

type Provider = "ollama" | "anthropic" | "openai" | "gemini";

const OLLAMA_MODELS = [
  { id: "llama3.2:3b", label: "Llama 3.2 (3B)", desc: "Recommended · fast · 2GB" },
  { id: "llama3.2:latest", label: "Llama 3.2 (8B)", desc: "More capable · 4GB" },
  { id: "qwen2.5:1.5b", label: "Qwen 2.5 (1.5B)", desc: "Lightest · 1GB · older computers" },
  { id: "mistral:latest", label: "Mistral 7B", desc: "Strong reasoning · 4GB" },
  { id: "deepseek-coder:6.7b", label: "DeepSeek Coder", desc: "Best for code · 4GB" },
];

const CLOUD_MODELS: Record<string, { id: string; label: string; desc: string }[]> = {
  anthropic: [
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku", desc: "Fastest · lowest cost" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet", desc: "Recommended · best balance" },
    { id: "claude-opus-4-8", label: "Claude Opus", desc: "Most powerful" },
  ],
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Fastest · lowest cost" },
    { id: "gpt-4o", label: "GPT-4o", desc: "Recommended · best balance" },
    { id: "o1-mini", label: "o1 Mini", desc: "Advanced reasoning" },
  ],
  gemini: [
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", desc: "Fastest · generous free tier" },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", desc: "Most capable" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Latest · fast" },
  ],
};

const PROVIDER_INFO = {
  ollama: {
    icon: "⬡",
    label: "Ollama (Local)",
    sublabel: "Free · runs on your computer · no account needed",
    badge: "FREE",
    badgeColor: "#34C759",
    steps: [
      { n: 1, text: "Go to ollama.com and click Download" },
      { n: 2, text: "Install it like any Mac app — drag to Applications" },
      { n: 3, text: 'Open Terminal and type: ollama pull llama3.2:3b' },
      { n: 4, text: "Come back here, pick your model below, and hit Save" },
    ],
    securityNote: null,
    getKeyUrl: null,
  },
  anthropic: {
    icon: "◆",
    label: "Anthropic Claude",
    sublabel: "Best quality · web search · paid",
    badge: null,
    badgeColor: null,
    steps: [
      { n: 1, text: "Go to console.anthropic.com and create a free account" },
      { n: 2, text: 'Click "API Keys" in the left sidebar' },
      { n: 3, text: 'Click "Create Key", give it a name like "Runway"' },
      { n: 4, text: "Copy the key and paste it in the field below" },
      { n: 5, text: "Hit Save — your key is encrypted and never shown again" },
    ],
    securityNote: "Your API key is like a password. Never share it in a chat, email, or screenshot.",
    getKeyUrl: "https://console.anthropic.com",
  },
  openai: {
    icon: "⬤",
    label: "OpenAI",
    sublabel: "GPT-4o · widely supported · paid",
    badge: null,
    badgeColor: null,
    steps: [
      { n: 1, text: "Go to platform.openai.com and create a free account" },
      { n: 2, text: 'Click your profile icon → "API Keys"' },
      { n: 3, text: 'Click "Create new secret key"' },
      { n: 4, text: "Copy the key and paste it in the field below" },
      { n: 5, text: "Hit Save — your key is encrypted and never shown again" },
    ],
    securityNote: "Your API key is like a password. Never share it in a chat, email, or screenshot.",
    getKeyUrl: "https://platform.openai.com/api-keys",
  },
  gemini: {
    icon: "✦",
    label: "Google Gemini",
    sublabel: "Generous free tier · paid for heavy use",
    badge: "FREE TIER",
    badgeColor: "#007AFF",
    steps: [
      { n: 1, text: "Go to aistudio.google.com — sign in with your Google account" },
      { n: 2, text: 'Click "Get API Key" in the top left' },
      { n: 3, text: 'Click "Create API Key in new project"' },
      { n: 4, text: "Copy the key and paste it in the field below" },
      { n: 5, text: "Hit Save — your key is encrypted and never shown again" },
    ],
    securityNote: "Your API key is like a password. Never share it in a chat, email, or screenshot.",
    getKeyUrl: "https://aistudio.google.com/app/apikey",
  },
};

// ---- Small components ----

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12, fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
      {children}
    </p>
  );
}

function SecurityBanner() {
  return (
    <div style={{ background: "#FFF3CD", border: "1.5px solid #FFCD39", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>🔒</span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#856404", margin: "0 0 4px" }}>Keep your API key private</p>
        <p style={{ fontSize: 13, color: "#856404", margin: 0, lineHeight: 1.5 }}>
          An API key is like a password — it gives access to your account and can charge you money. <strong>Never paste it into a chat, email, or screenshot.</strong> If you accidentally share it, go delete it immediately and create a new one.
        </p>
      </div>
    </div>
  );
}

function StepList({ steps }: { steps: { n: number; text: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {steps.map((s) => (
        <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ minWidth: 24, height: 24, background: "#1D1D1F", color: "#fff", borderRadius: "50%", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
            {s.n}
          </span>
          <p style={{ fontSize: 14, color: "#1D1D1F", margin: 0, lineHeight: 1.5 }}>{s.text}</p>
        </div>
      ))}
    </div>
  );
}

function ModelPicker({ models, selected, onSelect }: {
  models: { id: string; label: string; desc: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {models.map((m) => (
        <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: `2px solid ${selected === m.id ? "#1D1D1F" : "#E5E5EA"}`, borderRadius: 12, cursor: "pointer", background: selected === m.id ? "#F5F5F7" : "#fff", transition: "all 0.15s" }}>
          <input type="radio" name="model" value={m.id} checked={selected === m.id} onChange={() => onSelect(m.id)} style={{ accentColor: "#1D1D1F" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>{m.label}</p>
            <p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0" }}>{m.desc}</p>
          </div>
          {m.desc.includes("Recommended") && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#34C759", background: "#F0FFF4", padding: "3px 8px", borderRadius: 6 }}>RECOMMENDED</span>
          )}
        </label>
      ))}
    </div>
  );
}

// ---- Main page ----

function SettingsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SettingsData | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const upgraded = searchParams.get("upgraded") === "true";

  const [provider, setProvider] = useState<Provider>("ollama");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [ollamaModel, setOllamaModel] = useState("llama3.2:3b");
  const [cloudModel, setCloudModel] = useState<Record<string, string>>({
    anthropic: "claude-sonnet-4-6",
    openai: "gpt-4o-mini",
    gemini: "gemini-1.5-flash",
  });
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Schedule state
  const [schedule, setSchedule] = useState({
    businessStartHour: 4, businessStartMin: 30,
    businessEndHour: 17, businessEndMin: 30,
    businessDays: [1, 2, 3, 4, 5],
    offHoursStartHour: 18, offHoursStartMin: 0,
    offHoursRunWeekends: true,
    coolDownMinutes: 30,
  });
  const [useLocalForSimple, setUseLocalForSimple] = useState(true);
  const [useCloudForComplex, setUseCloudForComplex] = useState(true);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/settings").then((r) => r.json()).then((d: SettingsData) => {
        setData(d);
        if (d.aiSettings) {
          setProvider((d.aiSettings.llmProvider as Provider) || "ollama");
          setOllamaModel(d.aiSettings.ollamaModel || "llama3.2:3b");
          if (d.aiSettings.scheduleConfig) setSchedule(s => ({ ...s, ...d.aiSettings!.scheduleConfig }));
          if (typeof d.aiSettings.useLocalForSimple === "boolean") setUseLocalForSimple(d.aiSettings.useLocalForSimple);
          if (typeof d.aiSettings.useCloudForComplex === "boolean") setUseCloudForComplex(d.aiSettings.useCloudForComplex);
        }
      }).catch(() => null);
    }
  }, [status, router]);

  async function handleSaveAI(e: React.FormEvent) {
    e.preventDefault();
    setAiSaving(true); setAiSaved(false);
    const selectedModel = provider === "ollama" ? ollamaModel : (cloudModel[provider] ?? "");
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llmProvider: provider,
          anthropicKey,
          openaiKey,
          geminiKey,
          ollamaHost: "http://localhost:11434",
          ollamaModel: provider === "ollama" ? selectedModel : ollamaModel,
          selectedModel,
        }),
      });
      setAiSaved(true);
      setAnthropicKey(""); setOpenaiKey(""); setGeminiKey("");
      setShowKey(false);
      const updated = await fetch("/api/settings").then((r) => r.json());
      setData(updated);
      setTimeout(() => setAiSaved(false), 3000);
    } finally { setAiSaving(false); }
  }

  async function saveSchedule() {
    setScheduleSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ llmProvider: provider, scheduleConfig: schedule, useLocalForSimple, useCloudForComplex }),
    });
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 3000);
    setScheduleSaving(false);
  }

  if (status === "loading" || !data) {
    return <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 48px" }}><p style={{ color: "#8E8E93" }}>Loading…</p></div>;
  }

  const ai = data.aiSettings;
  const info = PROVIDER_INFO[provider];
  const hasKey = (p: Provider) => {
    if (p === "anthropic") return !!ai?.anthropicKeyLast4;
    if (p === "openai") return !!ai?.openaiKeyLast4;
    if (p === "gemini") return !!ai?.geminiKeyLast4;
    return true;
  };
  const keyLast4 = (p: Provider) => {
    if (p === "anthropic") return ai?.anthropicKeyLast4;
    if (p === "openai") return ai?.openaiKeyLast4;
    if (p === "gemini") return ai?.geminiKeyLast4;
    return null;
  };

  const subStatus = data.subscription?.status ?? "none";
  const isTrialing = subStatus === "trialing";
  const isActive = subStatus === "active";
  const trialEnd = data.subscription?.trialEndsAt ? new Date(data.subscription.trialEndsAt) : null;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const focusAreas: string[] = data.orgProfile?.focusAreas ? JSON.parse(data.orgProfile.focusAreas) : [];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 48px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.5px" }}>Settings</h1>
        <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>Manage your account, AI model, and organization profile.</p>
      </div>

      {upgraded && (
        <div style={{ background: "#34C759", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎉</span>
          <p style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>Welcome to Runway Pro! Your subscription is active.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── AI Model ── */}
        <Card>
          <SectionLabel>AI Model</SectionLabel>

          {/* Intro */}
          <div style={{ background: "#F5F5F7", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
            <p style={{ fontSize: 14, color: "#1D1D1F", fontWeight: 600, margin: "0 0 4px" }}>Which AI should power your agents?</p>
            <p style={{ fontSize: 13, color: "#6E6E73", margin: 0, lineHeight: 1.6 }}>
              Start free with Ollama — it runs on your computer with no account needed. When you&apos;re ready, connect a cloud provider for faster, smarter agents. You can switch anytime.
            </p>
          </div>

          {/* Quality ladder */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 10px" }}>
              Better hardware or cloud = better agent output
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { tier: "Basic", color: "#8E8E93", bg: "#F5F5F7", icon: "⬡", desc: "Local small model (1–3B)", detail: "Gets the job done · slower · best for older computers" },
                { tier: "Good", color: "#FF9500", bg: "#FFF8EE", icon: "⬡", desc: "Local large model (7–13B) or Gemini Flash", detail: "Noticeably better writing and reasoning · faster" },
                { tier: "Great", color: "#007AFF", bg: "#EFF6FF", icon: "⬤", desc: "OpenAI GPT-4o or Gemini Pro", detail: "Strong outputs · good for grant writing and email drafts" },
                { tier: "Best", color: "#34C759", bg: "#F0FFF4", icon: "◆", desc: "Anthropic Claude Sonnet or Opus", detail: "Highest quality · web search · best grant strategy and donor emails" },
              ].map((row) => (
                <div key={row.tier} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: row.bg, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: row.color, minWidth: 36, textTransform: "uppercase", letterSpacing: 0.5 }}>{row.tier}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{row.desc}</span>
                    <span style={{ fontSize: 12, color: "#6E6E73" }}> — {row.detail}</span>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 10, lineHeight: 1.5 }}>
              As your nonprofit grows and generates revenue, you can upgrade your hardware or cloud plan and your agents automatically get smarter — no other changes needed.
            </p>
          </div>

          <form onSubmit={handleSaveAI} style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Step 1 — Pick a provider */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "0 0 12px" }}>Step 1 — Choose your AI provider</p>

              <p style={{ fontSize: 11, fontWeight: 700, color: "#34C759", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Free</p>
              <div style={{ marginBottom: 12 }}>
                {(["ollama"] as Provider[]).map((p) => (
                  <ProviderRow key={p} p={p} selected={provider === p} hasKey={hasKey(p)} onSelect={() => setProvider(p)} />
                ))}
              </div>

              <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Cloud — bring your own API key</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(["anthropic", "openai", "gemini"] as Provider[]).map((p) => (
                  <ProviderRow key={p} p={p} selected={provider === p} hasKey={hasKey(p)} onSelect={() => setProvider(p)} />
                ))}
              </div>
            </div>

            {/* Step 2 — Setup instructions */}
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "0 0 14px" }}>
                Step 2 — Set up {info.label}
              </p>
              <StepList steps={info.steps} />
              {info.getKeyUrl && (
                <a href={info.getKeyUrl} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 13, fontWeight: 600, color: "#007AFF", textDecoration: "none" }}>
                  Open {info.label} dashboard ↗
                </a>
              )}
            </div>

            {/* Security warning for cloud providers */}
            {provider !== "ollama" && (
              <SecurityBanner />
            )}

            {/* Step 3 — Enter key or pick model */}
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "0 0 14px" }}>
                {provider === "ollama" ? "Step 3 — Choose your model" : "Step 3 — Enter your API key"}
              </p>

              {provider === "ollama" && (
                <ModelPicker models={OLLAMA_MODELS} selected={ollamaModel} onSelect={setOllamaModel} />
              )}

              {provider !== "ollama" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Key input */}
                  <div style={{ position: "relative" }}>
                    <input
                      type={showKey ? "text" : "password"}
                      value={provider === "anthropic" ? anthropicKey : provider === "openai" ? openaiKey : geminiKey}
                      onChange={(e) => {
                        if (provider === "anthropic") setAnthropicKey(e.target.value);
                        else if (provider === "openai") setOpenaiKey(e.target.value);
                        else setGeminiKey(e.target.value);
                      }}
                      placeholder={hasKey(provider) ? `Key saved (ends in …${keyLast4(provider)}) — paste new key to replace` : "Paste your API key here"}
                      autoComplete="new-password"
                      style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 10, padding: "12px 48px 12px 14px", fontSize: 14, color: "#1D1D1F", outline: "none", boxSizing: "border-box", fontFamily: "monospace", background: "#FAFAFA" }}
                    />
                    <button type="button" onClick={() => setShowKey(!showKey)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#8E8E93", padding: 0, lineHeight: 1 }}>
                      {showKey ? "🙈" : "👁"}
                    </button>
                  </div>
                  {hasKey(provider) && (
                    <p style={{ fontSize: 12, color: "#34C759", fontWeight: 600 }}>
                      ✓ {info.label} key is connected
                    </p>
                  )}

                  {/* Model picker for cloud */}
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "0 0 10px" }}>Choose your model</p>
                    <ModelPicker
                      models={CLOUD_MODELS[provider] ?? []}
                      selected={cloudModel[provider] ?? ""}
                      onSelect={(id) => setCloudModel((prev) => ({ ...prev, [provider]: id }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save */}
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <button type="submit" disabled={aiSaving}
                style={{ background: aiSaving ? "#E5E5EA" : "#1D1D1F", color: aiSaving ? "#8E8E93" : "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: aiSaving ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
                {aiSaving ? "Saving…" : "Save Settings"}
              </button>
              {aiSaved && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <span style={{ fontSize: 14, color: "#34C759", fontWeight: 600 }}>Saved! Your agents will use {info.label} from now on.</span>
                </div>
              )}
            </div>
          </form>
        </Card>

        {/* ── Schedule & Model Routing ── */}
        <Card>
          <SectionLabel>Agent Schedule & Cost Control</SectionLabel>
          <p style={{ fontSize: 13, color: "#6E6E73", marginBottom: 20, lineHeight: 1.6 }}>
            Set when your agents work. Default: <strong>4:30 AM – 5:30 PM ET</strong> for business tasks, <strong>6:00 PM onwards</strong> for off-hours Upwork work. Adjust to save on API costs.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Business hours */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "0 0 12px" }}>Business Hours (CEO, grants, email, marketing)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>Start Time (ET)</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="number" min={0} max={23} value={schedule.businessStartHour} onChange={e => setSchedule(s => ({ ...s, businessStartHour: +e.target.value }))}
                      style={{ width: 64, border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", textAlign: "center" }} />
                    <span style={{ fontSize: 18, color: "#8E8E93", alignSelf: "center" }}>:</span>
                    <input type="number" min={0} max={59} step={15} value={schedule.businessStartMin} onChange={e => setSchedule(s => ({ ...s, businessStartMin: +e.target.value }))}
                      style={{ width: 64, border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", textAlign: "center" }} />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>End / Cool-down (ET)</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="number" min={0} max={23} value={schedule.businessEndHour} onChange={e => setSchedule(s => ({ ...s, businessEndHour: +e.target.value }))}
                      style={{ width: 64, border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", textAlign: "center" }} />
                    <span style={{ fontSize: 18, color: "#8E8E93", alignSelf: "center" }}>:</span>
                    <input type="number" min={0} max={59} step={15} value={schedule.businessEndMin} onChange={e => setSchedule(s => ({ ...s, businessEndMin: +e.target.value }))}
                      style={{ width: 64, border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", textAlign: "center" }} />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>Cool-down (min)</p>
                  <input type="number" min={0} max={120} step={15} value={schedule.coolDownMinutes} onChange={e => setSchedule(s => ({ ...s, coolDownMinutes: +e.target.value }))}
                    style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
                </div>
              </div>
              {/* Day selector */}
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, i) => (
                  <button key={d} onClick={() => setSchedule(s => ({ ...s, businessDays: s.businessDays.includes(i) ? s.businessDays.filter(x => x !== i) : [...s.businessDays, i].sort() }))}
                    style={{ flex: 1, padding: "6px 0", border: "1.5px solid #E5E5EA", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: schedule.businessDays.includes(i) ? "#1D1D1F" : "#fff", color: schedule.businessDays.includes(i) ? "#fff" : "#8E8E93", transition: "all 0.15s" }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Off-hours */}
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "0 0 12px" }}>Off-Hours (Upwork jobs, background tasks)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>Start Time (ET)</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="number" min={0} max={23} value={schedule.offHoursStartHour} onChange={e => setSchedule(s => ({ ...s, offHoursStartHour: +e.target.value }))}
                      style={{ width: 64, border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", textAlign: "center" }} />
                    <span style={{ fontSize: 18, color: "#8E8E93", alignSelf: "center" }}>:</span>
                    <input type="number" min={0} max={59} step={15} value={schedule.offHoursStartMin} onChange={e => setSchedule(s => ({ ...s, offHoursStartMin: +e.target.value }))}
                      style={{ width: 64, border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", textAlign: "center" }} />
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", paddingTop: 24 }}>
                  <input type="checkbox" checked={schedule.offHoursRunWeekends} onChange={e => setSchedule(s => ({ ...s, offHoursRunWeekends: e.target.checked }))} style={{ width: 18, height: 18, accentColor: "#1D1D1F" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>Run off-hours on weekends too</span>
                </label>
              </div>
            </div>

            {/* Model routing */}
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "0 0 6px" }}>Smart Model Routing — save tokens automatically</p>
              <p style={{ fontSize: 12, color: "#6E6E73", marginBottom: 14 }}>Route simple tasks to cheap/local models and complex tasks to powerful ones. Reduces token usage by up to 85%.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", border: "1.5px solid #E5E5EA", borderRadius: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={useLocalForSimple} onChange={e => setUseLocalForSimple(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: "#34C759", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>⬡ Local model for simple tasks</p>
                    <p style={{ fontSize: 12, color: "#8E8E93", margin: "3px 0 0" }}>CEO summaries, status reports, short email drafts → Ollama (free). Saves cloud tokens for what matters.</p>
                  </div>
                </label>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", border: "1.5px solid #E5E5EA", borderRadius: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={useCloudForComplex} onChange={e => setUseCloudForComplex(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: "#34C759", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>◆ Cloud model for complex tasks</p>
                    <p style={{ fontSize: 12, color: "#8E8E93", margin: "3px 0 0" }}>Grant strategies, donor emails, job deliverables → Claude Sonnet / GPT-4o. Best quality where it counts.</p>
                  </div>
                </label>
              </div>
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#F5F5F7", borderRadius: 10 }}>
                <p style={{ fontSize: 12, color: "#6E6E73", margin: 0 }}>
                  Current routing: <strong>Status reports, summaries</strong> → {useLocalForSimple ? "local (free)" : "cloud"} · <strong>Grant strategies, deliverables</strong> → {useCloudForComplex ? "cloud (powerful)" : "local"}
                </p>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={saveSchedule} disabled={scheduleSaving}
                style={{ background: scheduleSaving ? "#E5E5EA" : "#1D1D1F", color: scheduleSaving ? "#8E8E93" : "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: scheduleSaving ? "not-allowed" : "pointer" }}>
                {scheduleSaving ? "Saving…" : "Save Schedule"}
              </button>
              {scheduleSaved && <span style={{ fontSize: 14, color: "#34C759", fontWeight: 600 }}>✅ Schedule saved — agents will follow this from now on.</span>}
            </div>
          </div>
        </Card>

        {/* ── Account ── */}
        <Card>
          <SectionLabel>Account</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><p style={{ fontSize: 12, color: "#8E8E93" }}>Name</p><p style={{ fontSize: 15, color: "#1D1D1F", fontWeight: 500 }}>{session?.user?.name || "—"}</p></div>
            <div><p style={{ fontSize: 12, color: "#8E8E93" }}>Email</p><p style={{ fontSize: 15, color: "#1D1D1F", fontWeight: 500 }}>{session?.user?.email || "—"}</p></div>
          </div>
        </Card>

        {/* ── Subscription ── */}
        <Card>
          <SectionLabel>Subscription</SectionLabel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ display: "inline-block", background: isActive ? "#34C759" : isTrialing ? "#FF9500" : "#8E8E93", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {isActive ? "Pro" : isTrialing ? "Trial" : subStatus}
                </span>
              </div>
              {isTrialing && trialEnd && <p style={{ fontSize: 14, color: "#6E6E73" }}>{trialDaysLeft > 0 ? `${trialDaysLeft} days remaining` : "Trial expired"}</p>}
              {isActive && data.subscription?.currentPeriodEnd && <p style={{ fontSize: 14, color: "#6E6E73" }}>Renews {new Date(data.subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>}
              {!isActive && !isTrialing && <p style={{ fontSize: 14, color: "#6E6E73" }}>No active subscription</p>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {!isActive && (
                <button onClick={async () => { const res = await fetch("/api/stripe/checkout", { method: "POST" }); const json = await res.json(); if (json.url) window.location.href = json.url; }}
                  style={{ background: "#34C759", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Upgrade to Pro
                </button>
              )}
              {isActive && (
                <button onClick={async () => { setPortalLoading(true); const res = await fetch("/api/stripe/portal", { method: "POST" }); const json = await res.json(); setPortalLoading(false); if (json.url) window.location.href = json.url; }}
                  disabled={portalLoading}
                  style={{ background: portalLoading ? "#E5E5EA" : "#1D1D1F", color: portalLoading ? "#8E8E93" : "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: portalLoading ? "not-allowed" : "pointer" }}>
                  {portalLoading ? "Loading…" : "Manage Subscription"}
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* ── Org Profile ── */}
        {data.orgProfile ? (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <SectionLabel>Organization Profile</SectionLabel>
              <a href="/onboarding" style={{ fontSize: 13, color: "#1D1D1F", fontWeight: 600, textDecoration: "none", padding: "6px 14px", border: "1.5px solid #E5E5EA", borderRadius: 8 }}>Edit</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><p style={{ fontSize: 12, color: "#8E8E93" }}>Organization</p><p style={{ fontSize: 15, color: "#1D1D1F", fontWeight: 500 }}>{data.orgProfile.orgName}</p></div>
              <div><p style={{ fontSize: 12, color: "#8E8E93" }}>Location</p><p style={{ fontSize: 15, color: "#1D1D1F", fontWeight: 500 }}>{data.orgProfile.location}</p></div>
              <div><p style={{ fontSize: 12, color: "#8E8E93" }}>Mission</p><p style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.5 }}>{data.orgProfile.mission}</p></div>
              {focusAreas.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, color: "#8E8E93", marginBottom: 6 }}>Focus Areas</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {focusAreas.map((area) => <span key={area} style={{ background: "#F0F0F0", color: "#1D1D1F", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 500 }}>{area}</span>)}
                  </div>
                </div>
              )}
              {data.orgProfile.website && <div><p style={{ fontSize: 12, color: "#8E8E93" }}>Website</p><a href={data.orgProfile.website} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: "#1D1D1F", fontWeight: 500 }}>{data.orgProfile.website}</a></div>}
            </div>
          </Card>
        ) : (
          <Card>
            <p style={{ color: "#8E8E93", fontSize: 14, marginBottom: 12 }}>You haven&apos;t set up your organization profile yet.</p>
            <a href="/onboarding" style={{ display: "inline-block", background: "#1D1D1F", color: "#fff", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Set up org profile</a>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProviderRow({ p, selected, hasKey, onSelect }: { p: Provider; selected: boolean; hasKey: boolean; onSelect: () => void }) {
  const info = PROVIDER_INFO[p];
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: `2px solid ${selected ? "#1D1D1F" : "#E5E5EA"}`, borderRadius: 12, cursor: "pointer", background: selected ? "#F5F5F7" : "#fff", transition: "all 0.15s", marginBottom: 8 }}>
      <input type="radio" name="provider" value={p} checked={selected} onChange={onSelect} style={{ accentColor: "#1D1D1F" }} />
      <span style={{ fontSize: 20, lineHeight: 1, minWidth: 24, textAlign: "center" }}>{info.icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>{info.label}</p>
        <p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0" }}>{info.sublabel}</p>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {hasKey && p !== "ollama" && <span style={{ fontSize: 11, fontWeight: 700, color: "#34C759" }}>✓ Connected</span>}
        {info.badge && <span style={{ fontSize: 11, fontWeight: 700, color: info.badgeColor!, background: info.badgeColor === "#34C759" ? "#F0FFF4" : "#EFF6FF", padding: "3px 8px", borderRadius: 6 }}>{info.badge}</span>}
      </div>
    </label>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "#8E8E93" }}>Loading…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
