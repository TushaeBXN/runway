"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Channel, ChannelMessage, AGENT_DISPLAY_NAMES, AGENT_ROLE_LABELS, FACE_CONFIGS, AGENT_VOICE, AGENT_ICONS } from "./components/types";
import { AgentFace } from "./components/AgentFace";
import { MessageBubble } from "./components/MessageBubble";
import { ChannelSidebar } from "./components/ChannelSidebar";

export default function TeamPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [muted, setMuted] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingAgentId, setSpeakingAgentId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const sseRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sseAttemptsRef = useRef(0);
  const sseLastSinceRef = useRef<string>(new Date().toISOString());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const initialLoadDoneRef = useRef(false);

  // Load channels on mount
  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.json())
      .then((data: Channel[]) => {
        setChannels(data);
        if (data.length > 0) setActiveId(data[0].id);
      });
  }, []);

  const fetchMessages = useCallback(async (channelId: string) => {
    const msgs = await fetch(`/api/channels/${channelId}/messages`).then((r) => r.json());
    setMessages(msgs);
  }, []);

  // Load messages + open SSE stream when channel changes
  useEffect(() => {
    if (!activeId) return;

    sseRef.current?.close();
    sseRef.current = null;
    if (sseRetryRef.current) { clearTimeout(sseRetryRef.current); sseRetryRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    sseAttemptsRef.current = 0;

    let destroyed = false;

    function startPollingFallback() {
      if (destroyed || pollRef.current) return;
      pollRef.current = setInterval(() => fetchMessages(activeId!), 4000);
    }

    function openSSE(since: string) {
      if (destroyed) return;
      const es = new EventSource(`/api/channels/${activeId}/stream?since=${encodeURIComponent(since)}`);
      sseRef.current = es;

      es.onmessage = (e) => {
        if (e.lastEventId) sseLastSinceRef.current = e.lastEventId;
        try {
          const newMsgs: ChannelMessage[] = JSON.parse(e.data);
          if (newMsgs.length > 0) {
            const last = newMsgs[newMsgs.length - 1];
            if (last?.createdAt) sseLastSinceRef.current = last.createdAt;
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const fresh = newMsgs.filter((m) => !existingIds.has(m.id));
              return fresh.length > 0 ? [...prev, ...fresh] : prev;
            });
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
        sseRef.current = null;
        if (destroyed) return;
        sseAttemptsRef.current += 1;
        if (sseAttemptsRef.current <= 4) {
          const delay = Math.min(1000 * Math.pow(2, sseAttemptsRef.current - 1), 8000);
          console.log(`[SSE] retry ${sseAttemptsRef.current}/4 in ${delay}ms`);
          sseRetryRef.current = setTimeout(() => { if (!destroyed) openSSE(sseLastSinceRef.current); }, delay);
        } else {
          console.log("[SSE] max retries, falling back to polling");
          startPollingFallback();
        }
      };
    }

    setLoadingMessages(true);
    fetchMessages(activeId).finally(() => {
      setLoadingMessages(false);
      const since = new Date().toISOString();
      sseLastSinceRef.current = since;
      if (!destroyed) openSSE(since);
    });

    return () => {
      destroyed = true;
      sseRef.current?.close(); sseRef.current = null;
      if (sseRetryRef.current) { clearTimeout(sseRetryRef.current); sseRetryRef.current = null; }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [activeId, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-speak new agent messages
  useEffect(() => {
    if (messages.length === 0) return;
    if (!initialLoadDoneRef.current) {
      lastSpokenIdRef.current = messages[messages.length - 1].id;
      initialLoadDoneRef.current = true;
      return;
    }
    const last = messages[messages.length - 1];
    if (last.senderType === "user" || last.id === lastSpokenIdRef.current) return;
    lastSpokenIdRef.current = last.id;
    const text = last.msgType === "approval_card"
      ? `${last.senderName} has a draft ready for your review.`
      : last.content;
    speakMessage(text, last.senderId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || sending || !activeId) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    const optimistic: ChannelMessage = {
      id: `opt-${Date.now()}`, channelId: activeId, senderId: "user", senderType: "user",
      senderName: "You", content: text, msgType: "text", approvalStatus: null,
      payload: null, actionType: null, createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      await fetch(`/api/channels/${activeId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      await fetchMessages(activeId);
    } finally { setSending(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleDecide(msgId: string, action: "approved" | "rejected") {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, approvalStatus: action } : m)));
  }

  async function uploadFile(file: File) {
    if (!activeId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("channelId", activeId);
      await fetch("/api/upload", { method: "POST", body: formData });
      await fetchMessages(activeId);
    } finally { setUploading(false); }
  }

  function speakMessage(text: string, agentId?: string) {
    if (muted || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.slice(0, 400));
    const cfg = AGENT_VOICE[agentId ?? ""] ?? { pitch: 1.0, rate: 1.0, voiceName: "" };
    utt.pitch = cfg.pitch; utt.rate = cfg.rate;
    if (cfg.voiceName) {
      const named = window.speechSynthesis.getVoices().find((v) => v.name.includes(cfg.voiceName) && v.lang.startsWith("en"));
      if (named) utt.voice = named;
    }
    if (agentId) setSpeakingAgentId(agentId);
    utt.onend = () => setSpeakingAgentId(null);
    utt.onerror = () => setSpeakingAgentId(null);
    window.speechSynthesis.speak(utt);
  }

  function startListening() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported in this browser."); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any;
    rec.lang = "en-US"; rec.continuous = false; rec.interimResults = false;
    setListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  }

  const activeChannel = channels.find((c) => c.id === activeId);
  const pendingCount = messages.filter((m) => m.msgType === "approval_card" && m.approvalStatus === "pending").length;

  return (
    <div style={{ display: "flex", height: "calc(100vh - var(--nav-height) - 24px)", background: "#F5F5F7", overflow: "hidden", margin: "-24px -24px 0" }}>
      <ChannelSidebar channels={channels} activeId={activeId} onSelect={setActiveId} />

      {/* Main chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Channel header */}
        <div style={{ background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.06)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>
                {activeChannel?.type === "dm" ? activeChannel.name : `# ${activeChannel?.name ?? "…"}`}
              </span>
              {pendingCount > 0 && (
                <span style={{ background: "#FF9500", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                  {pendingCount} pending approval{pendingCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {activeChannel?.description && <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 1 }}>{activeChannel.description}</p>}
          </div>
          <button
            onClick={() => { setMuted((m) => !m); window.speechSynthesis?.cancel(); }}
            title={muted ? "Unmute agents" : "Mute agents"}
            style={{ background: muted ? "#F5F5F7" : "transparent", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: "5px 10px", fontSize: 13, cursor: "pointer", color: muted ? "#8E8E93" : "#1D1D1F", display: "flex", alignItems: "center", gap: 5 }}
          >
            {muted ? "🔇" : "🔊"} {muted ? "Muted" : "Voice on"}
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {loadingMessages && messages.length === 0 && (
            <div style={{ textAlign: "center", color: "#8E8E93", fontSize: 14, marginTop: 40 }}>Loading…</div>
          )}
          {!loadingMessages && messages.length === 0 && (
            <div style={{ textAlign: "center", marginTop: 60 }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>{activeChannel?.type === "dm" ? AGENT_ICONS[activeChannel.agentId ?? ""] ?? "🤖" : "💬"}</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F" }}>
                {activeChannel?.type === "dm" ? `DM ${activeChannel?.name}` : `Welcome to #${activeChannel?.name}`}
              </p>
              <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 6, maxWidth: 360, margin: "6px auto 0" }}>
                {activeChannel?.type === "dm"
                  ? `Send a message to start working with ${activeChannel?.name} directly.`
                  : "Just talk — Anne routes your message to the right agent automatically. Or use @marketing, @grants, @dev… to target one directly."}
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} onDecide={handleDecide} speakingAgentId={speakingAgentId} />
          ))}
          {sending && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F5F5F7", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⋯</div>
              <div style={{ background: "#fff", borderRadius: "16px 16px 16px 4px", padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#8E8E93", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 20px 16px", background: "#fff", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ background: "#F5F5F7", borderRadius: 14, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md" style={{ display: "none" }}
              onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(file); e.target.value = ""; }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Upload document for analysis"
              style={{ background: "transparent", border: "none", padding: "4px 6px", fontSize: 18, cursor: uploading ? "wait" : "pointer", color: uploading ? "#C7C7CC" : "#8E8E93", flexShrink: 0, lineHeight: 1 }}>
              {uploading ? "⏳" : "📎"}
            </button>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={activeChannel?.type === "dm" ? `Message ${activeChannel?.name ?? "agent"}…` : `Message #${activeChannel?.name ?? "channel"} — Anne will route it, or use @grants @marketing @dev…`}
              rows={1}
              style={{ flex: 1, border: "none", outline: "none", resize: "none", fontSize: 14, color: "#1D1D1F", background: "transparent", fontFamily: "inherit", lineHeight: 1.5, maxHeight: 120, overflowY: "auto" }} />
            <button onClick={startListening} disabled={listening} title="Speak your message"
              style={{ background: listening ? "#FF3B30" : "transparent", border: "none", borderRadius: 9, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: listening ? "wait" : "pointer", flexShrink: 0, color: listening ? "#fff" : "#8E8E93", animation: listening ? "pulse 1s ease-in-out infinite" : "none" }}>
              🎤
            </button>
            <button onClick={sendMessage} disabled={sending || !input.trim()}
              style={{ background: sending || !input.trim() ? "#E5E5EA" : "#1D1D1F", color: sending || !input.trim() ? "#8E8E93" : "#fff", border: "none", borderRadius: 9, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: sending || !input.trim() ? "not-allowed" : "pointer", flexShrink: 0 }}>
              ↑
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#8E8E93", marginTop: 6, textAlign: "center" }}>
            Anne auto-routes · or target directly: @ceo · @marketing · @dev · @inbox · @grants · @research
          </p>
        </div>
      </div>

      {/* Floating speaking overlay */}
      {speakingAgentId && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#fff", borderRadius: 22, padding: "14px 20px 14px 14px", boxShadow: "0 16px 48px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 14, zIndex: 9999, border: `2.5px solid ${FACE_CONFIGS[speakingAgentId]?.eye ?? "#0A84FF"}`, animation: "slideInFace 0.35s cubic-bezier(0.34,1.56,0.64,1)", minWidth: 210 }}>
          <AgentFace agentId={speakingAgentId} size={72} isSpeaking={true} />
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: "0 0 2px" }}>{AGENT_DISPLAY_NAMES[speakingAgentId] ?? speakingAgentId}</p>
            <p style={{ fontSize: 11, color: FACE_CONFIGS[speakingAgentId]?.eye ?? "#8E8E93", margin: "0 0 4px", fontWeight: 600 }}>{AGENT_ROLE_LABELS[speakingAgentId] ?? "Agent"}</p>
            <p style={{ fontSize: 11, color: "#8E8E93", margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
              {[0, 0.2, 0.4].map((d, i) => <span key={i} style={{ animation: `agentSpeak 0.6s ${d}s infinite`, display: "inline-block" }}>●</span>)}
            </p>
          </div>
          <button onClick={() => { window.speechSynthesis?.cancel(); setSpeakingAgentId(null); }}
            style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: "#C7C7CC", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
        @keyframes agentBlink { 0%, 88%, 100% { transform: scaleY(1); } 93% { transform: scaleY(0.07); } }
        @keyframes agentSpeak { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.9; } }
        @keyframes slideInFace { from { opacity: 0; transform: translateY(24px) scale(0.85); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}
