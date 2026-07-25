"use client";
import { useState, useEffect } from "react";
import { FACE_CONFIGS } from "./types";

export function AgentFace({ agentId, size = 36, isSpeaking = false }: { agentId: string; size?: number; isSpeaking?: boolean }) {
  const [mouthOpen, setMouthOpen] = useState(false);

  useEffect(() => {
    if (!isSpeaking) { setMouthOpen(false); return; }
    const id = setInterval(() => setMouthOpen((v) => !v), 190);
    return () => clearInterval(id);
  }, [isSpeaking]);

  const cfg = FACE_CONFIGS[agentId] ?? { bg: "#3A3A3C", eye: "#8E8E93" };
  const br = Math.round(size / 3.5);

  return (
    <div style={{ width: size, height: size, borderRadius: br, overflow: "hidden", flexShrink: 0, position: "relative" }}>
      <svg viewBox="0 0 40 40" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" fill={cfg.bg} />
        <ellipse cx="20" cy="24" rx="12" ry="13" fill="rgba(255,255,255,0.10)" />
        <path d="M 10.5 12.5 Q 14 10.5 17.5 12.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" fill="none" strokeLinecap="round"
          style={{ transform: isSpeaking ? "translateY(-1.5px)" : "none", transition: "transform 0.2s" }} />
        <path d="M 22.5 12.5 Q 26 10.5 29.5 12.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" fill="none" strokeLinecap="round"
          style={{ transform: isSpeaking ? "translateY(-1.5px)" : "none", transition: "transform 0.2s" }} />
        <ellipse cx="14" cy="17" rx="3.5" ry="4" fill="white" style={{ animation: "agentBlink 4s 0.9s infinite", transformBox: "fill-box", transformOrigin: "center" }} />
        <ellipse cx="26" cy="17" rx="3.5" ry="4" fill="white" style={{ animation: "agentBlink 4s infinite",       transformBox: "fill-box", transformOrigin: "center" }} />
        <circle cx="15" cy="18" r="2" fill={cfg.eye} />
        <circle cx="27" cy="18" r="2" fill={cfg.eye} />
        <circle cx="13.8" cy="16.5" r="0.9" fill="rgba(255,255,255,0.9)" />
        <circle cx="25.8" cy="16.5" r="0.9" fill="rgba(255,255,255,0.9)" />
        {mouthOpen ? (
          <ellipse cx="20" cy="28" rx="5" ry="3.5" fill="rgba(0,0,0,0.65)" />
        ) : (
          <path d="M 14 28 Q 20 32 26 28" stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}
        {isSpeaking && (
          <circle cx="20" cy="20" r="19" fill="none" stroke={cfg.eye} strokeWidth="2.5"
            style={{ animation: "agentSpeak 0.7s ease-in-out infinite" }} />
        )}
      </svg>
    </div>
  );
}

export function UserAvatar({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "#6E6E73",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, color: "#fff", flexShrink: 0,
    }}>
      B
    </div>
  );
}
