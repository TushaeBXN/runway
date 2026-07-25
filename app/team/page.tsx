"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { payloadToPDF } from "@/lib/pdfBuilder";
import { payloadToPPTX } from "@/lib/pptxBuilder";
import { payloadToCSV } from "@/lib/csvBuilder";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: string;
  agentId: string | null;
  createdAt: string;
}

interface ChannelMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderType: string;
  senderName: string;
  content: string;
  msgType: string;
  approvalStatus: string | null;
  payload: string | null;
  actionType: string | null;
  createdAt: string;
}

const AGENT_ICONS: Record<string, string> = {
  ceoAgent: "◆",
  marketingAgent: "◈",
  devAgent: "⊞",
  inboxAgent: "✉",
  grantArchitectAgent: "★",
  upworkScoutAgent: "◎",
  jobExecutorAgent: "⚡",
  hardwareFundAgent: "◉",
  marketResearchAgent: "◍",
};

const ACTION_LABELS: Record<string, string> = {
  social_post:      "Social Post Draft",
  email:            "Email Draft",
  grant_strategy:   "Grant Strategy",
  job_deliverable:  "Deliverable",
  action_items:     "Meeting Action Items",
  donor_summary:    "Donor Report",
  financial_summary:"Financial Summary",
  general_summary:  "Document Analysis",
  inventory_report: "Inventory & Logistics Report",
  support_response: "Customer Support Draft",
  financial_report: "Financial Report (P&L)",
};

const FACE_CONFIGS: Record<string, { bg: string; eye: string }> = {
  ceoAgent:              { bg: "#1D1D1F", eye: "#0A84FF" },
  marketingAgent:        { bg: "#C0392B", eye: "#FFD60A" },
  grantArchitectAgent:   { bg: "#1A6B35", eye: "#34C759" },
  inboxAgent:            { bg: "#005F8A", eye: "#5AC8FA" },
  devAgent:              { bg: "#3A3A3C", eye: "#30D158" },
  marketResearchAgent:   { bg: "#6A2E9E", eye: "#BF5AF2" },
  upworkScoutAgent:      { bg: "#A04200", eye: "#FF9F0A" },
  jobExecutorAgent:      { bg: "#0A5C70", eye: "#5AC8FA" },
  hardwareFundAgent:     { bg: "#8B3A00", eye: "#FF6B35" },
  documentAnalyst:       { bg: "#3A3A3C", eye: "#8E8E93" },
  logisticsAgent:        { bg: "#5C3A1E", eye: "#FF9F0A" },
  customerSupportAgent:  { bg: "#0D5F4F", eye: "#34C759" },
  bookkeepingAgent:      { bg: "#1A3A6E", eye: "#5AC8FA" },
};

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  ceoAgent: "Marcus", marketingAgent: "Brian", devAgent: "Alex", inboxAgent: "Kelsey",
  grantArchitectAgent: "Diana", upworkScoutAgent: "Tim", jobExecutorAgent: "Jordan",
  hardwareFundAgent: "Chip", marketResearchAgent: "Gerald", documentAnalyst: "Gerald",
  logisticsAgent: "Dwayne", customerSupportAgent: "Kira", bookkeepingAgent: "Kelvin",
};

const AGENT_ROLE_LABELS: Record<string, string> = {
  ceoAgent: "CEO", marketingAgent: "Marketing", devAgent: "Engineering",
  inboxAgent: "Communications", grantArchitectAgent: "Grants", upworkScoutAgent: "Biz Dev",
  jobExecutorAgent: "Delivery", hardwareFundAgent: "Finance Tracker", marketResearchAgent: "Research",
  documentAnalyst: "Analysis", logisticsAgent: "Logistics", customerSupportAgent: "Support",
  bookkeepingAgent: "Bookkeeping",
};

function AgentFace({ agentId, size = 36, isSpeaking = false }: { agentId: string; size?: number; isSpeaking?: boolean }) {
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
        {/* Background */}
        <rect width="40" height="40" fill={cfg.bg} />

        {/* Face glow */}
        <ellipse cx="20" cy="24" rx="12" ry="13" fill="rgba(255,255,255,0.10)" />

        {/* Eyebrows */}
        <path d="M 10.5 12.5 Q 14 10.5 17.5 12.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" fill="none" strokeLinecap="round"
          style={{ transform: isSpeaking ? "translateY(-1.5px)" : "none", transition: "transform 0.2s" }} />
        <path d="M 22.5 12.5 Q 26 10.5 29.5 12.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" fill="none" strokeLinecap="round"
          style={{ transform: isSpeaking ? "translateY(-1.5px)" : "none", transition: "transform 0.2s" }} />

        {/* Eyes — white sclera */}
        <ellipse cx="14" cy="17" rx="3.5" ry="4"  fill="white" style={{ animation: "agentBlink 4s 0.9s infinite", transformBox: "fill-box", transformOrigin: "center" }} />
        <ellipse cx="26" cy="17" rx="3.5" ry="4"  fill="white" style={{ animation: "agentBlink 4s infinite",       transformBox: "fill-box", transformOrigin: "center" }} />

        {/* Pupils */}
        <circle cx="15" cy="18" r="2" fill={cfg.eye} />
        <circle cx="27" cy="18" r="2" fill={cfg.eye} />

        {/* Eye shine */}
        <circle cx="13.8" cy="16.5" r="0.9" fill="rgba(255,255,255,0.9)" />
        <circle cx="25.8" cy="16.5" r="0.9" fill="rgba(255,255,255,0.9)" />

        {/* Mouth */}
        {mouthOpen ? (
          <ellipse cx="20" cy="28" rx="5" ry="3.5" fill="rgba(0,0,0,0.65)" />
        ) : (
          <path d="M 14 28 Q 20 32 26 28" stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}

        {/* Speaking pulse ring */}
        {isSpeaking && (
          <circle cx="20" cy="20" r="19" fill="none" stroke={cfg.eye} strokeWidth="2.5"
            style={{ animation: "agentSpeak 0.7s ease-in-out infinite" }} />
        )}
      </svg>
    </div>
  );
}

function UserAvatar({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#6E6E73",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      B
    </div>
  );
}

function pStr(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") {
    const o = val as Record<string, unknown>;
    return String(o.value ?? o.text ?? o.content ?? o.name ?? o.description ?? JSON.stringify(val));
  }
  return String(val ?? "");
}

function ApprovalCard({
  msg,
  onDecide,
}: {
  msg: ChannelMessage;
  onDecide: (msgId: string, action: "approved" | "rejected") => void;
}) {
  const [deciding, setDeciding] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingSlides, setDownloadingSlides] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(msg.payload ?? "{}");
  } catch {}

  const hasSlidesExport = ["grant_strategy", "donor_summary", "general_summary", "action_items", "financial_report"].includes(msg.actionType ?? "");
  const hasCSVExport = ["action_items", "donor_summary", "grant_strategy", "general_summary", "financial_summary", "financial_report", "inventory_report"].includes(msg.actionType ?? "");

  async function downloadPDF() {
    if (!msg.actionType || !payload) return;
    setDownloading(true);
    try {
      const pdfPayload = payloadToPDF(msg.actionType, payload);
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pdfPayload),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pdfPayload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  async function downloadSlides() {
    if (!msg.actionType) return;
    const pptxPayload = payloadToPPTX(msg.actionType, payload);
    if (!pptxPayload) return;
    setDownloadingSlides(true);
    try {
      const res = await fetch("/api/export/pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pptxPayload),
      });
      if (!res.ok) throw new Error("Slides generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pptxPayload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingSlides(false);
    }
  }

  async function downloadCSV() {
    if (!msg.actionType) return;
    const csvPayload = payloadToCSV(msg.actionType, payload);
    if (!csvPayload) return;
    setDownloadingCSV(true);
    try {
      const res = await fetch("/api/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(csvPayload),
      });
      if (!res.ok) throw new Error("CSV generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = csvPayload.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingCSV(false);
    }
  }

  async function decide(action: "approved" | "rejected") {
    setDeciding(true);
    await fetch(`/api/channels/${msg.channelId}/approve/${msg.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userNote: note }),
    });
    onDecide(msg.id, action);
    setDeciding(false);
  }

  const isApproved = msg.approvalStatus === "approved";
  const isRejected = msg.approvalStatus === "rejected";
  const isDone = isApproved || isRejected;

  return (
    <div
      style={{
        background: "#fff",
        border: `2px solid ${isDone ? (isApproved ? "#34C759" : "#E5E5EA") : "#FF9500"}`,
        borderRadius: 14,
        overflow: "hidden",
        maxWidth: 520,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: isDone ? (isApproved ? "#F0FFF4" : "#F5F5F7") : "#FFF8EE",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: isDone ? (isApproved ? "#34C759" : "#8E8E93") : "#FF9500",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {isDone
            ? isApproved ? "✓ Approved" : "✗ Rejected"
            : `⏳ ${ACTION_LABELS[msg.actionType ?? ""] ?? "Draft"} — Needs Approval`}
        </span>
        <div style={{ display: "flex", gap: 5 }}>
          <button
            onClick={downloadPDF}
            disabled={downloading}
            title="Download as PDF"
            style={{
              background: "transparent",
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 6,
              padding: "3px 9px",
              fontSize: 11,
              fontWeight: 600,
              color: "#6E6E73",
              cursor: downloading ? "wait" : "pointer",
            }}
          >
            {downloading ? "…" : "↓ PDF"}
          </button>
          {hasSlidesExport && (
            <button
              onClick={downloadSlides}
              disabled={downloadingSlides}
              title="Download as PowerPoint"
              style={{
                background: "transparent",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 6,
                padding: "3px 9px",
                fontSize: 11,
                fontWeight: 600,
                color: "#6E6E73",
                cursor: downloadingSlides ? "wait" : "pointer",
              }}
            >
              {downloadingSlides ? "…" : "↓ Slides"}
            </button>
          )}
          {hasCSVExport && (
            <button
              onClick={downloadCSV}
              disabled={downloadingCSV}
              title="Download as spreadsheet"
              style={{
                background: "transparent",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 6,
                padding: "3px 9px",
                fontSize: 11,
                fontWeight: 600,
                color: "#6E6E73",
                cursor: downloadingCSV ? "wait" : "pointer",
              }}
            >
              {downloadingCSV ? "…" : "↓ Sheet"}
            </button>
          )}
        </div>
      </div>

      {/* Content preview */}
      <div style={{ padding: "14px 16px" }}>
        {msg.actionType === "social_post" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(payload.xPost as string) && (
              <div
                style={{
                  background: "#F5F5F7",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#8E8E93",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    margin: "0 0 4px",
                  }}
                >
                  X / Twitter
                </p>
                <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.5, margin: 0 }}>
                  {pStr(payload.xPost)}
                </p>
              </div>
            )}
            {(payload.linkedInPost as string) && (
              <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 12px" }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#8E8E93",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    margin: "0 0 4px",
                  }}
                >
                  LinkedIn
                </p>
                <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.5, margin: 0 }}>
                  {pStr(payload.linkedInPost)}
                </p>
              </div>
            )}
          </div>
        )}

        {msg.actionType === "email" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", minWidth: 60 }}>TO</span>
              <span style={{ fontSize: 13, color: "#1D1D1F" }}>{pStr(payload.to)}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", minWidth: 60 }}>SUBJECT</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{pStr(payload.subject)}</span>
            </div>
            <div
              style={{
                background: "#F5F5F7",
                borderRadius: 10,
                padding: "10px 12px",
                marginTop: 4,
              }}
            >
              <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>
                {pStr(payload.body)}
              </p>
            </div>
          </div>
        )}

        {msg.actionType === "grant_strategy" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {payload.topPick && (
              <p style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>
                {pStr(payload.topPick)}
              </p>
            )}
            {payload.funder && (
              <p style={{ fontSize: 13, color: "#6E6E73", margin: 0 }}>
                {pStr(payload.funder)} · {pStr(payload.amount)}
              </p>
            )}
            {payload.hook && (
              <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
                "{pStr(payload.hook)}"
              </p>
            )}
          </div>
        )}

        {msg.actionType === "job_deliverable" && (
          <div
            style={{
              background: "#F5F5F7",
              borderRadius: 10,
              padding: "10px 12px",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>
              {pStr(payload.deliverable).slice(0, 600)}
              {pStr(payload.deliverable).length > 600 ? "…" : ""}
            </p>
          </div>
        )}

        {msg.actionType === "support_response" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {payload.customerIssue && (
              <p style={{ fontSize: 12, color: "#6E6E73", margin: 0, fontStyle: "italic" }}>
                Issue: {pStr(payload.customerIssue)}
              </p>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", minWidth: 60 }}>TO</span>
              <span style={{ fontSize: 13, color: "#1D1D1F" }}>{pStr(payload.to)}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", minWidth: 60 }}>SUBJECT</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{pStr(payload.subject)}</span>
            </div>
            <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 12px", marginTop: 4 }}>
              <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>
                {pStr(payload.body)}
              </p>
            </div>
            {payload.resolution && (
              <p style={{ fontSize: 12, color: "#34C759", margin: 0, fontWeight: 600 }}>
                Resolution: {pStr(payload.resolution)}
              </p>
            )}
          </div>
        )}

        {msg.actionType === "financial_report" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>
              {pStr(payload.period)}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              {payload.totalRevenue && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#34C759", letterSpacing: 0.5 }}>REVENUE</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F" }}>{pStr(payload.totalRevenue)}</div>
                </div>
              )}
              {payload.totalExpenses && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#FF3B30", letterSpacing: 0.5 }}>EXPENSES</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F" }}>{pStr(payload.totalExpenses)}</div>
                </div>
              )}
              {payload.netProfit && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#007AFF", letterSpacing: 0.5 }}>NET</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F" }}>{pStr(payload.netProfit)}</div>
                </div>
              )}
            </div>
            {payload.cashPosition && (
              <p style={{ fontSize: 12, color: "#6E6E73", margin: 0 }}>Cash: {pStr(payload.cashPosition)}</p>
            )}
          </div>
        )}

        {msg.actionType === "inventory_report" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {payload.summary && (
              <p style={{ fontSize: 13, color: "#1D1D1F", margin: 0 }}>{pStr(payload.summary)}</p>
            )}
            {Array.isArray(payload.lowStock) && (payload.lowStock as unknown[]).length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#FF9500", margin: "0 0 4px", letterSpacing: 0.5 }}>
                  LOW STOCK ({(payload.lowStock as unknown[]).length} items)
                </p>
                {(payload.lowStock as Array<{item?: string; currentStock?: string}>).slice(0, 3).map((item, i) => (
                  <p key={i} style={{ fontSize: 12, color: "#6E6E73", margin: "2px 0" }}>
                    • {item.item} — {item.currentStock} remaining
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isDone && (
        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {showNote && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for the agent (optional)"
              rows={2}
              style={{
                width: "100%",
                border: "1.5px solid #E5E5EA",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => decide("approved")}
              disabled={deciding}
              style={{
                flex: 1,
                background: "#34C759",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "9px",
                fontSize: 13,
                fontWeight: 700,
                cursor: deciding ? "not-allowed" : "pointer",
              }}
            >
              {deciding ? "…" : "✓ Approve"}
            </button>
            <button
              onClick={() => decide("rejected")}
              disabled={deciding}
              style={{
                flex: 1,
                background: "#fff",
                color: "#FF3B30",
                border: "1.5px solid #FF3B30",
                borderRadius: 8,
                padding: "9px",
                fontSize: 13,
                fontWeight: 700,
                cursor: deciding ? "not-allowed" : "pointer",
              }}
            >
              {deciding ? "…" : "✗ Reject"}
            </button>
            <button
              onClick={() => setShowNote((v) => !v)}
              style={{
                background: "#F5F5F7",
                color: "#6E6E73",
                border: "none",
                borderRadius: 8,
                padding: "9px 12px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              ✎
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  msg,
  onDecide,
  speakingAgentId,
}: {
  msg: ChannelMessage;
  onDecide: (msgId: string, action: "approved" | "rejected") => void;
  speakingAgentId: string | null;
}) {
  const isUser = msg.senderType === "user";
  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
      }}
    >
      {isUser ? <UserAvatar /> : <AgentFace agentId={msg.senderId} isSpeaking={msg.senderId === speakingAgentId} />}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          alignItems: isUser ? "flex-end" : "flex-start",
          maxWidth: "75%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!isUser && (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1D1D1F" }}>
              {msg.senderName}
            </span>
          )}
          <span style={{ fontSize: 11, color: "#8E8E93" }}>{time}</span>
        </div>

        {msg.msgType === "approval_card" ? (
          <ApprovalCard msg={msg} onDecide={onDecide} />
        ) : (
          <div
            style={{
              background: isUser ? "#1D1D1F" : "#fff",
              color: isUser ? "#fff" : "#1D1D1F",
              borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              padding: "10px 14px",
              fontSize: 14,
              lineHeight: 1.6,
              boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.07)",
              whiteSpace: "pre-wrap",
            }}
          >
            {msg.content}
          </div>
        )}
      </div>
    </div>
  );
}

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

  // Load messages when channel changes, then switch to SSE for live updates
  useEffect(() => {
    if (!activeId) return;

    // Tear down everything from the previous channel
    sseRef.current?.close();
    sseRef.current = null;
    if (sseRetryRef.current) { clearTimeout(sseRetryRef.current); sseRetryRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    sseAttemptsRef.current = 0;

    let destroyed = false; // true after cleanup runs — prevents stale closures acting

    function startPollingFallback() {
      if (destroyed || pollRef.current) return;
      pollRef.current = setInterval(() => fetchMessages(activeId!), 4000);
    }

    function openSSE(since: string) {
      if (destroyed) return;
      const url = `/api/channels/${activeId}/stream?since=${encodeURIComponent(since)}`;
      const es = new EventSource(url);
      sseRef.current = es;

      es.onmessage = (e) => {
        try {
          const newMsgs: ChannelMessage[] = JSON.parse(e.data);
          if (newMsgs.length > 0) {
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
          // Exponential backoff: 1s, 2s, 4s, 8s
          const delay = Math.min(1000 * Math.pow(2, sseAttemptsRef.current - 1), 8000);
          sseRetryRef.current = setTimeout(() => {
            if (!destroyed) openSSE(new Date().toISOString());
          }, delay);
        } else {
          // Give up on SSE — fall back to polling
          startPollingFallback();
        }
      };
    }

    setLoadingMessages(true);
    fetchMessages(activeId).finally(() => {
      setLoadingMessages(false);
      if (!destroyed) openSSE(new Date().toISOString());
    });

    return () => {
      destroyed = true;
      sseRef.current?.close();
      sseRef.current = null;
      if (sseRetryRef.current) { clearTimeout(sseRetryRef.current); sseRetryRef.current = null; }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [activeId, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-speak new agent messages (skip initial load batch)
  useEffect(() => {
    if (messages.length === 0) return;
    if (!initialLoadDoneRef.current) {
      // Mark the last message ID on first load so we don't speak history
      lastSpokenIdRef.current = messages[messages.length - 1].id;
      initialLoadDoneRef.current = true;
      return;
    }
    const last = messages[messages.length - 1];
    if (last.senderType === "user" || last.id === lastSpokenIdRef.current) return;
    lastSpokenIdRef.current = last.id;
    const text =
      last.msgType === "approval_card"
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

    // Optimistically add user message
    const optimistic: ChannelMessage = {
      id: `opt-${Date.now()}`,
      channelId: activeId,
      senderId: "user",
      senderType: "user",
      senderName: "You",
      content: text,
      msgType: "text",
      approvalStatus: null,
      payload: null,
      actionType: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await fetch(`/api/channels/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      await fetchMessages(activeId);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleDecide(msgId: string, action: "approved" | "rejected") {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, approvalStatus: action } : m))
    );
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
    } finally {
      setUploading(false);
    }
  }

  // Voice: named OS voice + pitch/rate fallback — all free (browser Speech Synthesis API)
  const AGENT_VOICE: Record<string, { pitch: number; rate: number; voiceName: string }> = {
    ceoAgent:              { pitch: 0.75, rate: 0.92, voiceName: "Daniel" },
    marketingAgent:        { pitch: 1.15, rate: 1.12, voiceName: "Fred" },
    grantArchitectAgent:   { pitch: 0.88, rate: 0.88, voiceName: "Victoria" },
    inboxAgent:            { pitch: 1.1,  rate: 1.0,  voiceName: "Samantha" },
    devAgent:              { pitch: 1.0,  rate: 1.08, voiceName: "Tom" },
    marketResearchAgent:   { pitch: 0.92, rate: 0.85, voiceName: "Alex" },
    upworkScoutAgent:      { pitch: 1.05, rate: 1.05, voiceName: "Moira" },
    documentAnalyst:       { pitch: 1.0,  rate: 0.9,  voiceName: "Karen" },
    logisticsAgent:        { pitch: 0.78, rate: 0.96, voiceName: "Fred" },
    customerSupportAgent:  { pitch: 1.18, rate: 0.98, voiceName: "Samantha" },
    bookkeepingAgent:      { pitch: 0.85, rate: 0.9,  voiceName: "Daniel" },
    jobExecutorAgent:      { pitch: 1.0,  rate: 1.0,  voiceName: "Tom" },
    hardwareFundAgent:     { pitch: 1.1,  rate: 1.0,  voiceName: "Alex" },
  };

  function speakMessage(text: string, agentId?: string) {
    if (muted || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.slice(0, 400));
    const cfg = AGENT_VOICE[agentId ?? ""] ?? { pitch: 1.0, rate: 1.0, voiceName: "" };
    utt.pitch = cfg.pitch;
    utt.rate = cfg.rate;
    // Try to find a named OS voice (free — built into every browser)
    if (cfg.voiceName) {
      const voices = window.speechSynthesis.getVoices();
      const named = voices.find((v) => v.name.includes(cfg.voiceName) && v.lang.startsWith("en"));
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
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    setListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      setInput(e.results[0][0].transcript);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  }

  const activeChannel = channels.find((c) => c.id === activeId);
  const channelList = channels.filter((c) => c.type === "channel");
  const dmList = channels.filter((c) => c.type === "dm");

  const pendingCount = messages.filter(
    (m) => m.msgType === "approval_card" && m.approvalStatus === "pending"
  ).length;

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - var(--nav-height) - 24px)",
        background: "#F5F5F7",
        overflow: "hidden",
        margin: "-24px -24px 0",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: 240,
          background: "#1D1D1F",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflowY: "auto",
        }}
      >
        {/* Workspace header */}
        <div style={{ padding: "20px 16px 12px" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>
            Runway
          </p>
          <p style={{ fontSize: 11, color: "#636366", marginTop: 2 }}>Team Workspace</p>
        </div>

        {/* Channels */}
        <div style={{ padding: "0 8px" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#636366",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              padding: "4px 8px",
              marginBottom: 2,
            }}
          >
            Channels
          </p>
          {channelList.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                padding: "6px 8px",
                borderRadius: 6,
                border: "none",
                background: activeId === c.id ? "rgba(255,255,255,0.12)" : "transparent",
                color: activeId === c.id ? "#fff" : "#8E8E93",
                fontSize: 14,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ color: "#636366" }}>#</span>
              {c.name}
            </button>
          ))}
        </div>

        {/* DMs */}
        {dmList.length > 0 && (
          <div style={{ padding: "12px 8px 0" }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#636366",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                padding: "4px 8px",
                marginBottom: 2,
              }}
            >
              Direct Messages
            </p>
            {dmList.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "none",
                  background: activeId === c.id ? "rgba(255,255,255,0.12)" : "transparent",
                  color: activeId === c.id ? "#fff" : "#8E8E93",
                  fontSize: 14,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {c.agentId && (
                  <span style={{ fontSize: 12 }}>
                    {AGENT_ICONS[c.agentId] ?? "🤖"}
                  </span>
                )}
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Bottom spacer */}
        <div style={{ flex: 1 }} />
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 11, color: "#636366" }}>
            @mention agents to put them to work
          </p>
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Channel header */}
        <div
          style={{
            background: "#fff",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>
                {activeChannel?.type === "dm"
                  ? activeChannel.name
                  : `# ${activeChannel?.name ?? "…"}`}
              </span>
              {pendingCount > 0 && (
                <span
                  style={{
                    background: "#FF9500",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 10,
                  }}
                >
                  {pendingCount} pending approval
                  {pendingCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {activeChannel?.description && (
              <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 1 }}>
                {activeChannel.description}
              </p>
            )}
          </div>
          <button
            onClick={() => { setMuted((m) => !m); window.speechSynthesis?.cancel(); }}
            title={muted ? "Unmute agents" : "Mute agents"}
            style={{
              background: muted ? "#F5F5F7" : "transparent",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 13,
              cursor: "pointer",
              color: muted ? "#8E8E93" : "#1D1D1F",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {muted ? "🔇" : "🔊"} {muted ? "Muted" : "Voice on"}
          </button>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {loadingMessages && messages.length === 0 && (
            <div style={{ textAlign: "center", color: "#8E8E93", fontSize: 14, marginTop: 40 }}>
              Loading…
            </div>
          )}

          {!loadingMessages && messages.length === 0 && (
            <div style={{ textAlign: "center", marginTop: 60 }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>
                {activeChannel?.type === "dm"
                  ? AGENT_ICONS[activeChannel.agentId ?? ""] ?? "🤖"
                  : "💬"}
              </p>
              <p style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F" }}>
                {activeChannel?.type === "dm"
                  ? `DM ${activeChannel?.name}`
                  : `Welcome to #${activeChannel?.name}`}
              </p>
              <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 6, maxWidth: 360, margin: "6px auto 0" }}>
                {activeChannel?.type === "dm"
                  ? `Send a message to start working with ${activeChannel?.name} directly.`
                  : `Just talk — Anne routes your message to the right agent automatically. Or use @marketing, @grants, @dev… to target one directly.`}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} onDecide={handleDecide} speakingAgentId={speakingAgentId} />
          ))}

          {sending && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "#F5F5F7",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                ⋯
              </div>
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px 16px 16px 4px",
                  padding: "12px 16px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#8E8E93",
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: "12px 20px 16px",
            background: "#fff",
            borderTop: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              background: "#F5F5F7",
              borderRadius: 14,
              padding: "10px 14px",
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Upload document for analysis"
              style={{
                background: "transparent",
                border: "none",
                padding: "4px 6px",
                fontSize: 18,
                cursor: uploading ? "wait" : "pointer",
                color: uploading ? "#C7C7CC" : "#8E8E93",
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              {uploading ? "⏳" : "📎"}
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeChannel?.type === "dm"
                  ? `Message ${activeChannel?.name ?? "agent"}…`
                  : `Message #${activeChannel?.name ?? "channel"} — Anne will route it, or use @grants @marketing @dev…`
              }
              rows={1}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: 14,
                color: "#1D1D1F",
                background: "transparent",
                fontFamily: "inherit",
                lineHeight: 1.5,
                maxHeight: 120,
                overflowY: "auto",
              }}
            />
            <button
              onClick={startListening}
              disabled={listening}
              title="Speak your message"
              style={{
                background: listening ? "#FF3B30" : "transparent",
                border: "none",
                borderRadius: 9,
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                cursor: listening ? "wait" : "pointer",
                flexShrink: 0,
                color: listening ? "#fff" : "#8E8E93",
                animation: listening ? "pulse 1s ease-in-out infinite" : "none",
              }}
            >
              🎤
            </button>
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              style={{
                background: sending || !input.trim() ? "#E5E5EA" : "#1D1D1F",
                color: sending || !input.trim() ? "#8E8E93" : "#fff",
                border: "none",
                borderRadius: 9,
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                flexShrink: 0,
              }}
            >
              ↑
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#8E8E93", marginTop: 6, textAlign: "center" }}>
            Anne auto-routes · or target directly: @ceo · @marketing · @dev · @inbox · @grants · @research
          </p>
        </div>
      </div>

      {/* Tamper Monkey-style floating face overlay when any agent speaks */}
      {speakingAgentId && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "#fff",
          borderRadius: 22,
          padding: "14px 20px 14px 14px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          zIndex: 9999,
          border: `2.5px solid ${FACE_CONFIGS[speakingAgentId]?.eye ?? "#0A84FF"}`,
          animation: "slideInFace 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          minWidth: 210,
        }}>
          <AgentFace agentId={speakingAgentId} size={72} isSpeaking={true} />
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: "0 0 2px" }}>
              {AGENT_DISPLAY_NAMES[speakingAgentId] ?? speakingAgentId}
            </p>
            <p style={{ fontSize: 11, color: FACE_CONFIGS[speakingAgentId]?.eye ?? "#8E8E93", margin: "0 0 4px", fontWeight: 600 }}>
              {AGENT_ROLE_LABELS[speakingAgentId] ?? "Agent"}
            </p>
            <p style={{ fontSize: 11, color: "#8E8E93", margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ animation: "agentSpeak 0.6s infinite", display: "inline-block" }}>●</span>
              <span style={{ animation: "agentSpeak 0.6s 0.2s infinite", display: "inline-block" }}>●</span>
              <span style={{ animation: "agentSpeak 0.6s 0.4s infinite", display: "inline-block" }}>●</span>
            </p>
          </div>
          <button
            onClick={() => { window.speechSynthesis?.cancel(); setSpeakingAgentId(null); }}
            style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: "#C7C7CC", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
          >✕</button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes agentBlink {
          0%, 88%, 100% { transform: scaleY(1); }
          93% { transform: scaleY(0.07); }
        }
        @keyframes agentSpeak {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.9; }
        }
        @keyframes slideInFace {
          from { opacity: 0; transform: translateY(24px) scale(0.85); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}
