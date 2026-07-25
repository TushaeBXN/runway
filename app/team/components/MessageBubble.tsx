"use client";
import { ChannelMessage } from "./types";
import { AgentFace, UserAvatar } from "./AgentFace";
import { ApprovalCard } from "./ApprovalCard";

export function MessageBubble({
  msg,
  onDecide,
  speakingAgentId,
}: {
  msg: ChannelMessage;
  onDecide: (msgId: string, action: "approved" | "rejected") => void;
  speakingAgentId: string | null;
}) {
  const isUser = msg.senderType === "user";
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "flex", gap: 10, flexDirection: isUser ? "row-reverse" : "row", alignItems: "flex-start" }}>
      {isUser ? <UserAvatar /> : <AgentFace agentId={msg.senderId} isSpeaking={msg.senderId === speakingAgentId} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: isUser ? "flex-end" : "flex-start", maxWidth: "75%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!isUser && <span style={{ fontSize: 12, fontWeight: 700, color: "#1D1D1F" }}>{msg.senderName}</span>}
          <span style={{ fontSize: 11, color: "#8E8E93" }}>{time}</span>
        </div>
        {msg.msgType === "approval_card" ? (
          <ApprovalCard msg={msg} onDecide={onDecide} />
        ) : (
          <div style={{
            background: isUser ? "#1D1D1F" : "#fff",
            color: isUser ? "#fff" : "#1D1D1F",
            borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            padding: "10px 14px", fontSize: 14, lineHeight: 1.6,
            boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.07)",
            whiteSpace: "pre-wrap",
          }}>
            {msg.content}
          </div>
        )}
      </div>
    </div>
  );
}
