"use client";
import { Channel, AGENT_ICONS } from "./types";

export function ChannelSidebar({
  channels,
  activeId,
  onSelect,
}: {
  channels: Channel[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const channelList = channels.filter((c) => c.type === "channel");
  const dmList = channels.filter((c) => c.type === "dm");

  const itemStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 6, width: "100%",
    padding: "6px 8px", borderRadius: 6, border: "none",
    background: active ? "rgba(255,255,255,0.12)" : "transparent",
    color: active ? "#fff" : "#8E8E93",
    fontSize: 14, cursor: "pointer", textAlign: "left",
  });

  return (
    <div style={{ width: 240, background: "#1D1D1F", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
      <div style={{ padding: "20px 16px 12px" }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>Runway</p>
        <p style={{ fontSize: 11, color: "#636366", marginTop: 2 }}>Team Workspace</p>
      </div>

      <div style={{ padding: "0 8px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#636366", textTransform: "uppercase", letterSpacing: 0.8, padding: "4px 8px", marginBottom: 2 }}>Channels</p>
        {channelList.map((c) => (
          <button key={c.id} onClick={() => onSelect(c.id)} style={itemStyle(activeId === c.id)}>
            <span style={{ color: "#636366" }}>#</span>{c.name}
          </button>
        ))}
      </div>

      {dmList.length > 0 && (
        <div style={{ padding: "12px 8px 0" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#636366", textTransform: "uppercase", letterSpacing: 0.8, padding: "4px 8px", marginBottom: 2 }}>Direct Messages</p>
          {dmList.map((c) => (
            <button key={c.id} onClick={() => onSelect(c.id)} style={itemStyle(activeId === c.id)}>
              {c.agentId && <span style={{ fontSize: 12 }}>{AGENT_ICONS[c.agentId] ?? "🤖"}</span>}
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: 11, color: "#636366" }}>@mention agents to put them to work</p>
      </div>
    </div>
  );
}
