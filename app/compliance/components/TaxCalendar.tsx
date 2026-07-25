"use client";
import { useState } from "react";
import { nextDueDate, daysUntil, urgencyColor, urgencyLabel } from "@/lib/taxDeadlines";

interface Reminder {
  id: string; type: string; label: string; dueDate: string; recurrence: string;
  amount?: number; notes?: string; lastPaidDate?: string;
}

interface Props {
  reminders: Reminder[];
  entityType: string;
  onSeedDeadlines: (replace: boolean) => Promise<void>;
  onMarkPaid: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  seeding: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  tax_federal: "🏛",
  tax_quarterly: "📅",
  state_filing: "🏢",
  tax: "📋",
  domain: "🌐",
  hosting: "☁️",
  pobox: "📬",
  phone: "📞",
  credit: "💳",
  duns: "🏢",
  custom: "📌",
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function daysUntilFromMmdd(mmdd: string): number {
  const next = nextDueDate(mmdd);
  return daysUntil(next);
}

function nextDateDisplay(mmdd: string): string {
  const d = nextDueDate(mmdd);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupByMonth(reminders: Reminder[]): Map<string, { reminder: Reminder; days: number; next: Date }[]> {
  const map = new Map<string, { reminder: Reminder; days: number; next: Date }[]>();
  for (const r of reminders) {
    const next = nextDueDate(r.dueDate);
    const days = daysUntil(next);
    const monthKey = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(monthKey)) map.set(monthKey, []);
    map.get(monthKey)!.push({ reminder: r, days, next });
  }
  // Sort each month group by day
  for (const [, items] of map) items.sort((a, b) => a.next.getTime() - b.next.getTime());
  // Return sorted by month
  return new Map([...map.entries()].sort());
}

export function TaxCalendar({ reminders, entityType, onSeedDeadlines, onMarkPaid, onDelete, seeding }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "overdue">("upcoming");
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const today = new Date();
  const cutoffDays = filter === "overdue" ? -999 : filter === "upcoming" ? 365 : 730;

  const filtered = reminders.filter((r) => {
    const days = daysUntilFromMmdd(r.dueDate);
    if (filter === "overdue") return days < 0;
    if (filter === "upcoming") return days >= -7 && days <= 365;
    return true;
  });

  const grouped = groupByMonth(filtered);
  const overdueCount = reminders.filter((r) => daysUntilFromMmdd(r.dueDate) < 0).length;
  const within30 = reminders.filter((r) => { const d = daysUntilFromMmdd(r.dueDate); return d >= 0 && d <= 30; }).length;
  const totalReserveNeeded = reminders.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  void cutoffDays; // used via filter logic above

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total Deadlines", value: reminders.length, color: "#1D1D1F" },
          { label: "Overdue", value: overdueCount, color: overdueCount > 0 ? "#FF3B30" : "#34C759" },
          { label: "Due in 30 Days", value: within30, color: within30 > 0 ? "#FF9500" : "#34C759" },
          { label: "Annual Reserve Needed", value: `$${totalReserveNeeded.toLocaleString()}`, color: "#007AFF" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#8E8E93", marginTop: 3, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Filter tabs */}
        <div style={{ display: "flex", background: "#F5F5F7", borderRadius: 10, padding: 3, gap: 2 }}>
          {(["upcoming", "overdue", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "6px 14px", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: filter === f ? "#fff" : "transparent", color: filter === f ? "#1D1D1F" : "#8E8E93", boxShadow: filter === f ? "0 1px 2px rgba(0,0,0,0.1)" : "none", textTransform: "capitalize" }}>
              {f === "overdue" && overdueCount > 0 ? `Overdue (${overdueCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Seed button */}
        {entityType ? (
          !confirmSeed ? (
            <button onClick={() => setConfirmSeed(true)} disabled={seeding}
              style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: seeding ? "wait" : "pointer" }}>
              {seeding ? "Seeding…" : `Auto-seed deadlines for ${entityType}`}
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#FF9500", fontWeight: 600 }}>Replace existing tax deadlines?</span>
              <button onClick={async () => { setConfirmSeed(false); await onSeedDeadlines(true); }}
                style={{ background: "#FF9500", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Replace</button>
              <button onClick={async () => { setConfirmSeed(false); await onSeedDeadlines(false); }}
                style={{ background: "#34C759", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add New Only</button>
              <button onClick={() => setConfirmSeed(false)}
                style={{ background: "transparent", color: "#8E8E93", border: "none", fontSize: 12, cursor: "pointer" }}>Cancel</button>
            </div>
          )
        ) : (
          <div style={{ fontSize: 12, color: "#FF9500", fontWeight: 600 }}>
            Set your entity type in Business Identity to enable auto-seeding
          </div>
        )}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: "48px 24px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: "0 0 8px" }}>No deadlines found</p>
          <p style={{ fontSize: 13, color: "#8E8E93" }}>
            {filter === "overdue" ? "Nothing overdue. You're on top of it." : "Add deadlines manually in the Deadlines tab, or auto-seed them above."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {[...grouped.entries()].map(([monthKey, items]) => {
            const [yr, mo] = monthKey.split("-").map(Number);
            const monthLabel = `${MONTH_NAMES[mo - 1]} ${yr}`;
            const monthColor = items.some((i) => i.days < 0) ? "#FF3B30" : items.some((i) => i.days <= 30) ? "#FF9500" : "#1D1D1F";
            return (
              <div key={monthKey}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: monthColor, minWidth: 80 }}>{monthLabel}</div>
                  <div style={{ flex: 1, height: 1, background: "#E5E5EA" }} />
                  <div style={{ fontSize: 11, color: "#8E8E93" }}>{items.length} deadline{items.length !== 1 ? "s" : ""}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map(({ reminder: r, days }) => {
                    const color = urgencyColor(days);
                    const isExpanded = expandedId === r.id;
                    const isPaid = !!r.lastPaidDate;

                    return (
                      <div key={r.id}
                        style={{ background: "#fff", borderRadius: 14, border: `1.5px solid ${isPaid ? "#E5E5EA" : days <= 30 ? color + "44" : "#F0F0F0"}`, overflow: "hidden", opacity: isPaid ? 0.65 : 1, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                        <div onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                          {/* Icon */}
                          <div style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICONS[r.type] ?? "📋"}</div>
                          {/* Label + date */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {isPaid ? "✓ " : ""}{r.label}
                            </div>
                            <div style={{ fontSize: 11, color: "#8E8E93", marginTop: 2 }}>
                              {nextDateDisplay(r.dueDate)} · {r.recurrence}
                              {r.amount ? ` · ~$${r.amount.toLocaleString()} reserve` : ""}
                            </div>
                          </div>
                          {/* Urgency badge */}
                          <div style={{ background: isPaid ? "#E5E5EA" : color, color: isPaid ? "#8E8E93" : days < 0 || days <= 14 ? "#fff" : "#1D1D1F", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 800, flexShrink: 0, whiteSpace: "nowrap" }}>
                            {isPaid ? "Filed" : urgencyLabel(days)}
                          </div>
                          <div style={{ color: "#C7C7CC", fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div style={{ borderTop: "1px solid #F0F0F0", padding: "14px 16px", background: "#FAFAFA", display: "flex", flexDirection: "column", gap: 12 }}>
                            {r.notes && (
                              <p style={{ fontSize: 13, color: "#3A3A3C", lineHeight: 1.6, margin: 0 }}>{r.notes}</p>
                            )}
                            {/* Left/right deadline bar */}
                            <div style={{ background: "#F0F0F0", borderRadius: 6, height: 6, overflow: "hidden" }}>
                              <div style={{ height: "100%", background: color, width: `${Math.max(5, Math.min(100, 100 - (days / 365) * 100))}%`, borderRadius: 6, transition: "width 0.3s" }} />
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              {!isPaid && (
                                <button onClick={async () => { setPaying(r.id); await onMarkPaid(r.id); setPaying(null); }} disabled={paying === r.id}
                                  style={{ background: "#34C759", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                  {paying === r.id ? "…" : "✓ Mark Filed / Paid"}
                                </button>
                              )}
                              <button onClick={async () => { setDeleting(r.id); await onDelete(r.id); setDeleting(null); setExpandedId(null); }} disabled={deleting === r.id}
                                style={{ background: "transparent", color: "#FF3B30", border: "1.5px solid #FF3B30", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                {deleting === r.id ? "…" : "Remove"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
