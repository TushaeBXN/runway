"use client";
import { useState } from "react";
import { payloadToPDF } from "@/lib/pdfBuilder";
import { payloadToPPTX } from "@/lib/pptxBuilder";
import { payloadToCSV } from "@/lib/csvBuilder";
import { ChannelMessage, ACTION_LABELS } from "./types";

function pStr(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") {
    const o = val as Record<string, unknown>;
    return String(o.value ?? o.text ?? o.content ?? o.name ?? o.description ?? JSON.stringify(val));
  }
  return String(val ?? "");
}

export function ApprovalCard({
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
  try { payload = JSON.parse(msg.payload ?? "{}"); } catch {}

  const hasSlidesExport = ["grant_strategy", "donor_summary", "general_summary", "action_items", "financial_report"].includes(msg.actionType ?? "");
  const hasCSVExport = ["action_items", "donor_summary", "grant_strategy", "general_summary", "financial_summary", "financial_report", "inventory_report"].includes(msg.actionType ?? "");

  async function downloadPDF() {
    if (!msg.actionType) return;
    setDownloading(true);
    try {
      const pdfPayload = payloadToPDF(msg.actionType, payload);
      const res = await fetch("/api/export/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pdfPayload) });
      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pdfPayload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setDownloading(false); }
  }

  async function downloadSlides() {
    if (!msg.actionType) return;
    const pptxPayload = payloadToPPTX(msg.actionType, payload);
    if (!pptxPayload) return;
    setDownloadingSlides(true);
    try {
      const res = await fetch("/api/export/pptx", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pptxPayload) });
      if (!res.ok) throw new Error("Slides failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pptxPayload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setDownloadingSlides(false); }
  }

  async function downloadCSV() {
    if (!msg.actionType) return;
    const csvPayload = payloadToCSV(msg.actionType, payload);
    if (!csvPayload) return;
    setDownloadingCSV(true);
    try {
      const res = await fetch("/api/export/csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(csvPayload) });
      if (!res.ok) throw new Error("CSV failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = csvPayload.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setDownloadingCSV(false); }
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

  const btnBase = { border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 600, color: "#6E6E73", background: "transparent" } as const;

  return (
    <div style={{ background: "#fff", border: `2px solid ${isDone ? (isApproved ? "#34C759" : "#E5E5EA") : "#FF9500"}`, borderRadius: 14, overflow: "hidden", maxWidth: 520 }}>
      {/* Header */}
      <div style={{ background: isDone ? (isApproved ? "#F0FFF4" : "#F5F5F7") : "#FFF8EE", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: isDone ? (isApproved ? "#34C759" : "#8E8E93") : "#FF9500", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {isDone ? (isApproved ? "✓ Approved" : "✗ Rejected") : `⏳ ${ACTION_LABELS[msg.actionType ?? ""] ?? "Draft"} — Needs Approval`}
        </span>
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={downloadPDF} disabled={downloading} title="Download as PDF" style={{ ...btnBase, cursor: downloading ? "wait" : "pointer" }}>{downloading ? "…" : "↓ PDF"}</button>
          {hasSlidesExport && <button onClick={downloadSlides} disabled={downloadingSlides} title="Download as PowerPoint" style={{ ...btnBase, cursor: downloadingSlides ? "wait" : "pointer" }}>{downloadingSlides ? "…" : "↓ Slides"}</button>}
          {hasCSVExport && <button onClick={downloadCSV} disabled={downloadingCSV} title="Download as spreadsheet" style={{ ...btnBase, cursor: downloadingCSV ? "wait" : "pointer" }}>{downloadingCSV ? "…" : "↓ Sheet"}</button>}
        </div>
      </div>

      {/* Content preview */}
      <div style={{ padding: "14px 16px" }}>
        {msg.actionType === "social_post" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {!!payload.xPost && <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 12px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 4px" }}>X / Twitter</p>
              <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.5, margin: 0 }}>{pStr(payload.xPost)}</p>
            </div>}
            {!!payload.linkedInPost && <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 12px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 4px" }}>LinkedIn</p>
              <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.5, margin: 0 }}>{pStr(payload.linkedInPost)}</p>
            </div>}
          </div>
        )}

        {msg.actionType === "email" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 6 }}><span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", minWidth: 60 }}>TO</span><span style={{ fontSize: 13, color: "#1D1D1F" }}>{pStr(payload.to)}</span></div>
            <div style={{ display: "flex", gap: 6 }}><span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", minWidth: 60 }}>SUBJECT</span><span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{pStr(payload.subject)}</span></div>
            <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 12px", marginTop: 4 }}>
              <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{pStr(payload.body)}</p>
            </div>
          </div>
        )}

        {msg.actionType === "grant_strategy" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {!!payload.topPick && <p style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>{pStr(payload.topPick)}</p>}
            {!!payload.funder && <p style={{ fontSize: 13, color: "#6E6E73", margin: 0 }}>{pStr(payload.funder)} · {pStr(payload.amount)}</p>}
            {!!payload.hook && <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>"{pStr(payload.hook)}"</p>}
          </div>
        )}

        {msg.actionType === "job_deliverable" && (
          <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 12px", maxHeight: 200, overflowY: "auto" }}>
            <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>
              {pStr(payload.deliverable).slice(0, 600)}{pStr(payload.deliverable).length > 600 ? "…" : ""}
            </p>
          </div>
        )}

        {msg.actionType === "support_response" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {!!payload.customerIssue && <p style={{ fontSize: 12, color: "#6E6E73", margin: 0, fontStyle: "italic" }}>Issue: {pStr(payload.customerIssue)}</p>}
            <div style={{ display: "flex", gap: 6 }}><span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", minWidth: 60 }}>TO</span><span style={{ fontSize: 13, color: "#1D1D1F" }}>{pStr(payload.to)}</span></div>
            <div style={{ display: "flex", gap: 6 }}><span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", minWidth: 60 }}>SUBJECT</span><span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{pStr(payload.subject)}</span></div>
            <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 12px", marginTop: 4 }}>
              <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{pStr(payload.body)}</p>
            </div>
            {!!payload.resolution && <p style={{ fontSize: 12, color: "#34C759", margin: 0, fontWeight: 600 }}>Resolution: {pStr(payload.resolution)}</p>}
          </div>
        )}

        {msg.actionType === "financial_report" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>{pStr(payload.period)}</p>
            <div style={{ display: "flex", gap: 12 }}>
              {!!payload.totalRevenue && <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, fontWeight: 700, color: "#34C759", letterSpacing: 0.5 }}>REVENUE</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F" }}>{pStr(payload.totalRevenue)}</div></div>}
              {!!payload.totalExpenses && <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, fontWeight: 700, color: "#FF3B30", letterSpacing: 0.5 }}>EXPENSES</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F" }}>{pStr(payload.totalExpenses)}</div></div>}
              {!!payload.netProfit && <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, fontWeight: 700, color: "#007AFF", letterSpacing: 0.5 }}>NET</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F" }}>{pStr(payload.netProfit)}</div></div>}
            </div>
            {!!payload.cashPosition && <p style={{ fontSize: 12, color: "#6E6E73", margin: 0 }}>Cash: {pStr(payload.cashPosition)}</p>}
          </div>
        )}

        {msg.actionType === "inventory_report" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {!!payload.summary && <p style={{ fontSize: 13, color: "#1D1D1F", margin: 0 }}>{pStr(payload.summary)}</p>}
            {Array.isArray(payload.lowStock) && (payload.lowStock as unknown[]).length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#FF9500", margin: "0 0 4px", letterSpacing: 0.5 }}>LOW STOCK ({(payload.lowStock as unknown[]).length} items)</p>
                {(payload.lowStock as Array<{ item?: string; currentStock?: string }>).slice(0, 3).map((item, i) => (
                  <p key={i} style={{ fontSize: 12, color: "#6E6E73", margin: "2px 0" }}>• {item.item} — {item.currentStock} remaining</p>
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
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the agent (optional)" rows={2}
              style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 8, padding: "8px 10px", fontSize: 12, resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => decide("approved")} disabled={deciding} style={{ flex: 1, background: "#34C759", color: "#fff", border: "none", borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 700, cursor: deciding ? "not-allowed" : "pointer" }}>{deciding ? "…" : "✓ Approve"}</button>
            <button onClick={() => decide("rejected")} disabled={deciding} style={{ flex: 1, background: "#fff", color: "#FF3B30", border: "1.5px solid #FF3B30", borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 700, cursor: deciding ? "not-allowed" : "pointer" }}>{deciding ? "…" : "✗ Reject"}</button>
            <button onClick={() => setShowNote((v) => !v)} style={{ background: "#F5F5F7", color: "#6E6E73", border: "none", borderRadius: 8, padding: "9px 12px", fontSize: 13, cursor: "pointer" }}>✎</button>
          </div>
        </div>
      )}
    </div>
  );
}
