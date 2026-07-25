"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface TimeEntry {
  id: string; staffName: string; staffEmail?: string | null; project: string;
  description?: string | null; hours: number; date: string;
  isVolunteer: boolean; hourlyRate?: number | null; approved: boolean;
}
interface ProjectAgg { hours: number; payroll: number; entries: number; }

const EMPTY = { staffName: "", staffEmail: "", project: "", description: "", hours: "", date: new Date().toISOString().split("T")[0], isVolunteer: false, hourlyRate: "" };

export default function TimeTrackerPage() {
  const { status } = useSession();
  const router = useRouter();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [byProject, setByProject] = useState<Record<string, ProjectAgg>>({});
  const [totalHours, setTotalHours] = useState(0);
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [volunteerHours, setVolunteerHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState("");
  const [filterVolunteer, setFilterVolunteer] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"log" | "projects">("log");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") load();
  }, [status]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterProject) params.set("project", filterProject);
    if (filterVolunteer) params.set("isVolunteer", filterVolunteer);
    const res = await fetch(`/api/time-tracker?${params}`);
    const d = await res.json();
    setEntries(d.entries ?? []);
    setByProject(d.byProject ?? {});
    setTotalHours(d.totalHours ?? 0);
    setTotalPayroll(d.totalPayroll ?? 0);
    setVolunteerHours(d.volunteerHours ?? 0);
    setLoading(false);
  }, [filterProject, filterVolunteer]);

  useEffect(() => { if (status === "authenticated") load(); }, [filterProject, filterVolunteer, load, status]);

  async function save() {
    setSaving(true);
    await fetch("/api/time-tracker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", ...form }) });
    setSaving(false); setShowAdd(false); setForm(EMPTY); load();
  }

  async function approve(id: string) {
    setApproving(id);
    await fetch("/api/time-tracker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve", id }) });
    setApproving(null); load();
  }

  async function deleteEntry(id: string) {
    setDeleting(id);
    await fetch("/api/time-tracker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    setDeleting(null); load();
  }

  const projects = Object.entries(byProject);
  if (status === "loading" || loading) return <div style={{ padding: 24, color: "#8E8E93" }}>Loading…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Time Tracker</h1>
          <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 4 }}>Staff & volunteer hours by project</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          + Log Hours
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Hours", value: totalHours.toFixed(1) + "h", color: "#007AFF" },
          { label: "Payroll Est.", value: "$" + totalPayroll.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }), color: "#34C759" },
          { label: "Volunteer Hrs", value: volunteerHours.toFixed(1) + "h", color: "#FF9500" },
          { label: "Projects", value: String(projects.length), color: "#5856D6" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: "0 0 4px" }}>{s.value}</p>
            <p style={{ fontSize: 12, color: "#6E6E73", margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.1)", marginBottom: 24, border: "1.5px solid #007AFF33" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: "0 0 18px" }}>Log Hours</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "Staff Name *", key: "staffName", type: "text", placeholder: "Jane Smith" },
              { label: "Email", key: "staffEmail", type: "email", placeholder: "jane@org.com" },
              { label: "Project *", key: "project", type: "text", placeholder: "Grant Outreach" },
              { label: "Hours *", key: "hours", type: "number", placeholder: "4" },
              { label: "Date *", key: "date", type: "date", placeholder: "" },
              { label: "Hourly Rate ($)", key: "hourlyRate", type: "number", placeholder: "25" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>{label}</label>
                <input type={type} placeholder={placeholder} value={String(form[key as keyof typeof form])}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Description</label>
              <input placeholder="What did they work on?" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#1D1D1F" }}>
                <input type="checkbox" checked={form.isVolunteer} onChange={(e) => setForm({ ...form, isVolunteer: e.target.checked })} />
                Volunteer hours (unpaid)
              </label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={save} disabled={saving || !form.staffName || !form.project || !form.hours}
              style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (!form.staffName || !form.project || !form.hours) ? 0.5 : 1 }}>
              {saving ? "Saving…" : "Log Hours"}
            </button>
            <button onClick={() => { setShowAdd(false); setForm(EMPTY); }} style={{ background: "none", border: "none", color: "#8E8E93", fontSize: 14, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[{ key: "log", label: "Time Log" }, { key: "projects", label: "By Project" }].map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key as "log" | "projects")}
            style={{ fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? "#fff" : "#6E6E73", background: activeTab === t.key ? "#1D1D1F" : "#F5F5F7", border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "log" ? (
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {entries.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>⏱</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F" }}>No time entries yet</p>
              <p style={{ fontSize: 13, color: "#8E8E93" }}>Log your first hours to get started.</p>
            </div>
          ) : entries.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", borderBottom: "1px solid #F5F5F7" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: e.isVolunteer ? "#FF950011" : "#007AFF11", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {e.isVolunteer ? "🙌" : "💼"}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: "0 0 2px" }}>{e.staffName} <span style={{ fontWeight: 400, color: "#8E8E93" }}>on</span> {e.project}</p>
                <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>{e.description || (e.isVolunteer ? "Volunteer hours" : "Staff hours")} · {new Date(e.date).toLocaleDateString()}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#1D1D1F", margin: "0 0 2px" }}>{e.hours}h</p>
                {e.hourlyRate && !e.isVolunteer && <p style={{ fontSize: 11, color: "#34C759", margin: 0 }}>${(e.hours * e.hourlyRate).toLocaleString()}</p>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {!e.approved && (
                  <button onClick={() => approve(e.id)} disabled={approving === e.id}
                    style={{ background: "#34C75911", color: "#34C759", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    {approving === e.id ? "…" : "Approve"}
                  </button>
                )}
                {e.approved && <span style={{ fontSize: 11, fontWeight: 700, color: "#34C759", padding: "5px 8px" }}>✓</span>}
                <button onClick={() => deleteEntry(e.id)} disabled={deleting === e.id}
                  style={{ background: "transparent", color: "#FF3B30", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>
                  {deleting === e.id ? "…" : "✕"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {projects.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 14, padding: 40, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#8E8E93" }}>No projects yet. Log some hours to see a breakdown.</p>
            </div>
          ) : projects.map(([project, agg]) => {
            const isExp = expandedProject === project;
            const projEntries = entries.filter((e) => e.project === project);
            return (
              <div key={project} style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => setExpandedProject(isExp ? null : project)}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: "0 0 2px" }}>{project}</p>
                    <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>{agg.entries} entries</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: "#007AFF", margin: "0 0 2px" }}>{agg.hours.toFixed(1)}h</p>
                    {agg.payroll > 0 && <p style={{ fontSize: 12, color: "#34C759", margin: 0 }}>${agg.payroll.toLocaleString()}</p>}
                  </div>
                  <span style={{ fontSize: 12, color: "#C7C7CC", transform: isExp ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
                </div>
                {isExp && projEntries.map((e) => (
                  <div key={e.id} style={{ display: "flex", gap: 12, padding: "10px 18px", borderTop: "1px solid #F5F5F7", background: "#FAFAFA" }}>
                    <span style={{ fontSize: 14 }}>{e.isVolunteer ? "🙌" : "💼"}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: "#1D1D1F", margin: "0 0 2px" }}>{e.staffName} — {e.hours}h {e.description ? `· ${e.description}` : ""}</p>
                      <p style={{ fontSize: 11, color: "#8E8E93", margin: 0 }}>{new Date(e.date).toLocaleDateString()} {e.approved ? "· ✓ Approved" : "· Pending"}</p>
                    </div>
                    {e.hourlyRate && !e.isVolunteer && <p style={{ fontSize: 13, fontWeight: 700, color: "#34C759", margin: 0 }}>${(e.hours * e.hourlyRate).toLocaleString()}</p>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
