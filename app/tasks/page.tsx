"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  scheduledFor: string;
  agentId?: string | null;
  createdAt: string;
}

const STATUS_TABS = [
  { key: "todo", label: "To Do" },
  { key: "recurring", label: "↻ Recurring" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
  { key: "failed", label: "Failed" },
];

const CATEGORIES = ["General", "Engineering", "Research", "Marketing", "Growth", "Operations"];
const SCHEDULED_OPTIONS = ["Tonight", "This Week", "Next Week"];

const CATEGORY_COLORS: Record<string, string> = {
  Engineering: "#E8F4FD",
  Research: "#F0E8FD",
  Marketing: "#FDE8F0",
  Growth: "#E8FDF0",
  Operations: "#FDF5E8",
  General: "#F0F0F5",
};

const CATEGORY_TEXT: Record<string, string> = {
  Engineering: "#0A7ABD",
  Research: "#7A0ABD",
  Marketing: "#BD0A4B",
  Growth: "#0ABD4B",
  Operations: "#BD7A0A",
  General: "#555580",
};

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    todo: { bg: "#F0F0F5", text: "#555580" },
    recurring: { bg: "#E8F4FD", text: "#0A7ABD" },
    in_progress: { bg: "#FFF3CD", text: "#856404" },
    completed: { bg: "#E8FDF0", text: "#0ABD4B" },
    rejected: { bg: "#FDE8E8", text: "#BD0A0A" },
    failed: { bg: "#F5E8FD", text: "#7A0ABD" },
  };
  const c = colors[status] || colors.todo;
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "capitalize",
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function TaskCard({
  task,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const catBg = CATEGORY_COLORS[task.category] || "#F0F0F5";
  const catText = CATEGORY_TEXT[task.category] || "#555580";

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E5EA",
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        position: "relative",
      }}
    >
      {/* Drag handle */}
      <span
        style={{
          color: "#C7C7CC",
          fontSize: 16,
          marginTop: 2,
          cursor: "grab",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        ⠿
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: 15,
              color: "#1D1D1F",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 360,
            }}
          >
            {task.title}
          </span>
          {task.agentId && (
            <span
              style={{
                fontSize: 10,
                color: "#8E8E93",
                background: "#F5F5F7",
                borderRadius: 4,
                padding: "2px 6px",
              }}
            >
              {task.agentId}
            </span>
          )}
        </div>

        <p
          style={{
            fontSize: 13,
            color: "#6E6E73",
            lineHeight: 1.45,
            margin: "0 0 10px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {task.description}
        </p>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {/* Category pill */}
          <span
            style={{
              background: catBg,
              color: catText,
              borderRadius: 20,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {task.category}
          </span>

          {/* scheduledFor pill */}
          <span
            style={{
              background: task.scheduledFor === "Tonight" ? "#1D1D1F" : "#F0F0F5",
              color: task.scheduledFor === "Tonight" ? "#fff" : "#6E6E73",
              borderRadius: 20,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {task.scheduledFor}
          </span>

          <StatusPill status={task.status} />
        </div>
      </div>

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: 2 }}>
        <span
          style={{
            fontSize: 13,
            color: "#1D1D1F",
            fontWeight: 500,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          onClick={() => setMenuOpen((p) => !p)}
        >
          Actions ▾
        </span>
      </div>

      {/* Actions dropdown */}
      {menuOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 50 }}
            onClick={() => setMenuOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% - 8px)",
              right: 8,
              background: "#fff",
              border: "1px solid #E5E5EA",
              borderRadius: 10,
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              zIndex: 100,
              padding: 6,
              minWidth: 170,
            }}
          >
            {STATUS_TABS.filter((t) => t.key !== task.status).map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  onStatusChange(task.id, t.key);
                  setMenuOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: "8px 12px",
                  fontSize: 13,
                  color: "#1D1D1F",
                  cursor: "pointer",
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#F5F5F7")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                Move to {t.label}
              </button>
            ))}
            <div style={{ height: 1, background: "#F0F0F0", margin: "4px 0" }} />
            <button
              onClick={() => {
                onDelete(task.id);
                setMenuOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                padding: "8px 12px",
                fontSize: 13,
                color: "#FF3B30",
                cursor: "pointer",
                borderRadius: 6,
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,59,48,0.06)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("todo");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "General",
    scheduledFor: "Tonight",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?status=${activeTab}`);
      const json = await res.json();
      setTasks(json.tasks || []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (status === "authenticated") fetchTasks();
  }, [status, activeTab, fetchTasks]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ title: "", description: "", category: "General", scheduledFor: "Tonight" });
        // If current tab is "todo", refresh
        if (activeTab === "todo") fetchTasks();
        else setActiveTab("todo");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      fetchTasks();
    } catch {
      // ignore
    }
  }

  if (status === "loading") {
    return (
      <div style={{ padding: "48px 24px", color: "#8E8E93" }}>Loading…</div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "0 24px 48px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#1D1D1F",
              letterSpacing: "-0.5px",
              margin: 0,
            }}
          >
            Tasks
          </h1>
          <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>
            {session?.user?.name
              ? `${session.user.name}'s workspace`
              : "Your workspace"}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "#1D1D1F",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          + New Task
        </button>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid #E5E5EA",
          marginBottom: 20,
          overflowX: "auto",
        }}
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #1D1D1F" : "2px solid transparent",
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? "#1D1D1F" : "#8E8E93",
              cursor: "pointer",
              whiteSpace: "nowrap",
              marginBottom: -1,
              transition: "color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "#8E8E93" }}>
          Loading tasks…
        </div>
      ) : tasks.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E5EA",
            borderRadius: 12,
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#8E8E93", fontSize: 15, marginBottom: 16 }}>
            No {STATUS_TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} tasks
          </p>
          {activeTab === "todo" && (
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: "#F5F5F7",
                color: "#1D1D1F",
                border: "none",
                borderRadius: 10,
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Create your first task
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* New Task Modal */}
      {showModal && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "28px 28px 24px",
                width: "100%",
                maxWidth: 500,
                boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#1D1D1F",
                    margin: 0,
                  }}
                >
                  New Task
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: 20,
                    color: "#8E8E93",
                    cursor: "pointer",
                    lineHeight: 1,
                    padding: 4,
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                    Title
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Task title"
                    required
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
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="What needs to be done?"
                    required
                    rows={3}
                    style={{
                      width: "100%",
                      border: "1.5px solid #E5E5EA",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontSize: 14,
                      color: "#1D1D1F",
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
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
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                      style={{
                        width: "100%",
                        border: "1.5px solid #E5E5EA",
                        borderRadius: 10,
                        padding: "10px 14px",
                        fontSize: 14,
                        color: "#1D1D1F",
                        outline: "none",
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: 1 }}>
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
                      Scheduled For
                    </label>
                    <select
                      value={form.scheduledFor}
                      onChange={(e) => setForm((p) => ({ ...p, scheduledFor: e.target.value }))}
                      style={{
                        width: "100%",
                        border: "1.5px solid #E5E5EA",
                        borderRadius: 10,
                        padding: "10px 14px",
                        fontSize: 14,
                        color: "#1D1D1F",
                        outline: "none",
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    >
                      {SCHEDULED_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: saving ? "#E5E5EA" : "#1D1D1F",
                    color: saving ? "#8E8E93" : "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 18px",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    marginTop: 4,
                  }}
                >
                  {saving ? "Creating…" : "Create Task"}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
