"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface LineItem { id: string; budgetId: string; category: string; type: string; label: string; planned: number; }
interface Budget { id: string; name: string; fiscalYear: number; lineItems: LineItem[]; }
interface Actuals { income: Record<string, number>; expense: Record<string, number>; }

const INCOME_CATS  = ["Gumroad Revenue", "Grant Awards", "Donations", "Other Income"];
const EXPENSE_CATS = ["Contractor Payments", "Staff Payroll", "Software & Tools", "Programs", "Marketing", "Office", "Reserve Withdrawals", "Other Expenses"];

const EMPTY_LINE = { category: "Other Income", type: "income", label: "", planned: "" };

function Bar({ actual, planned, type }: { actual: number; planned: number; type: string }) {
  const pct = planned > 0 ? Math.min((actual / planned) * 100, 100) : 0;
  const over = planned > 0 && actual > planned;
  const barColor = type === "income"
    ? (pct >= 100 ? "#34C759" : "#007AFF")
    : (over ? "#FF3B30" : pct > 75 ? "#FF9500" : "#5856D6");

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 6, background: "#F0F0F0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.4s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 10, color: "#8E8E93" }}>Actual: ${actual.toLocaleString()}</span>
        <span style={{ fontSize: 10, color: over ? "#FF3B30" : "#8E8E93" }}>
          {planned > 0 ? `${pct.toFixed(0)}% of $${planned.toLocaleString()} budget` : "No budget set"}
        </span>
      </div>
    </div>
  );
}

export default function BudgetPage() {
  const { status } = useSession();
  const router = useRouter();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [actuals, setActuals] = useState<Actuals>({ income: {}, expense: {} });
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [net, setNet] = useState(0);
  const [reserveBalance, setReserveBalance] = useState(0);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_LINE);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "income" | "expenses">("overview");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") load();
  }, [status]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/budget");
    const d = await res.json();
    setBudget(d.budget ?? null);
    setActuals(d.actuals ?? { income: {}, expense: {} });
    setTotalIncome(d.totalIncome ?? 0);
    setTotalExpense(d.totalExpense ?? 0);
    setNet(d.net ?? 0);
    setReserveBalance(d.reserveBalance ?? 0);
    setYear(d.year ?? new Date().getFullYear());
    setLoading(false);
  }, []);

  async function saveLine() {
    setSaving(true);
    await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert_line", ...(editId ? { id: editId } : {}), ...addForm, planned: Number(addForm.planned) }),
    });
    setSaving(false); setShowAdd(false); setEditId(null); setAddForm(EMPTY_LINE); load();
  }

  async function deleteLine(id: string) {
    setDeleting(id);
    await fetch("/api/budget", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_line", id }) });
    setDeleting(null); load();
  }

  function startEdit(item: LineItem) {
    setAddForm({ category: item.category, type: item.type, label: item.label, planned: String(item.planned) });
    setEditId(item.id); setShowAdd(true);
  }

  const incomeItems  = budget?.lineItems.filter(l => l.type === "income") ?? [];
  const expenseItems = budget?.lineItems.filter(l => l.type === "expense") ?? [];

  // Merge planned + actuals for income
  const allIncomeKeys = Array.from(new Set([...Object.keys(actuals.income), ...incomeItems.map(l => l.category)]));
  const allExpenseKeys = Array.from(new Set([...Object.keys(actuals.expense), ...expenseItems.map(l => l.category)]));

  const totalPlannedIncome  = incomeItems.reduce((s, l) => s + l.planned, 0);
  const totalPlannedExpense = expenseItems.reduce((s, l) => s + l.planned, 0);

  if (status === "loading" || loading) return <div style={{ padding: 24, color: "#8E8E93" }}>Loading…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Budget vs Actuals</h1>
          <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 4 }}>{year} fiscal year · auto-pulls from all connected modules</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/board-report" style={{ background: "#F5F5F7", color: "#1D1D1F", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center" }}>
            📋 Board Report
          </a>
          <button onClick={() => { setShowAdd(true); setEditId(null); setAddForm(EMPTY_LINE); }}
            style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            + Budget Line
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Income", actual: totalIncome, planned: totalPlannedIncome, color: "#007AFF" },
          { label: "Total Expenses", actual: totalExpense, planned: totalPlannedExpense, color: "#5856D6" },
          { label: net >= 0 ? "Surplus" : "Deficit", actual: Math.abs(net), planned: 0, color: net >= 0 ? "#34C759" : "#FF3B30" },
          { label: "Reserve Fund", actual: reserveBalance, planned: 0, color: "#FF9500" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `3px solid ${s.color}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 8px" }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: "0 0 4px" }}>${s.actual.toLocaleString()}</p>
            {s.planned > 0 && <p style={{ fontSize: 11, color: "#8E8E93", margin: 0 }}>of ${s.planned.toLocaleString()} budgeted</p>}
          </div>
        ))}
      </div>

      {/* Add / edit form */}
      {showAdd && (
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", boxShadow: "0 4px 24px rgba(0,0,0,0.1)", marginBottom: 24, border: "1.5px solid #007AFF33" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: "0 0 16px" }}>{editId ? "Edit Budget Line" : "Add Budget Line"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Type</label>
              <select value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value, category: e.target.value === "income" ? INCOME_CATS[0] : EXPENSE_CATS[0] })}
                style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none" }}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Category</label>
              <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none" }}>
                {(addForm.type === "income" ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Label</label>
              <input value={addForm.label} onChange={(e) => setAddForm({ ...addForm, label: e.target.value })} placeholder="e.g. Q2 grant target"
                style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Planned ($)</label>
              <input type="number" value={addForm.planned} onChange={(e) => setAddForm({ ...addForm, planned: e.target.value })} placeholder="0"
                style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={saveLine} disabled={saving || !addForm.planned}
              style={{ background: "#007AFF", color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: !addForm.planned ? 0.5 : 1 }}>
              {saving ? "Saving…" : editId ? "Save Changes" : "Add Line"}
            </button>
            <button onClick={() => { setShowAdd(false); setEditId(null); }} style={{ background: "none", border: "none", color: "#8E8E93", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[{ key: "overview", label: "Overview" }, { key: "income", label: "Income" }, { key: "expenses", label: "Expenses" }].map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
            style={{ fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? "#fff" : "#6E6E73", background: activeTab === t.key ? "#1D1D1F" : "#F5F5F7", border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {[
            { title: "Income", keys: allIncomeKeys, actMap: actuals.income, items: incomeItems, type: "income" },
            { title: "Expenses", keys: allExpenseKeys, actMap: actuals.expense, items: expenseItems, type: "expense" },
          ].map(({ title, keys, actMap, items, type }) => (
            <div key={title} style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 0.8 }}>{title}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {keys.map(cat => {
                  const actual  = actMap[cat] ?? 0;
                  const planned = items.find(l => l.category === cat)?.planned ?? 0;
                  return (
                    <div key={cat}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{cat}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: type === "income" ? "#007AFF" : "#5856D6" }}>${actual.toLocaleString()}</span>
                      </div>
                      <Bar actual={actual} planned={planned} type={type} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {(activeTab === "income" || activeTab === "expenses") && (() => {
        const isIncome = activeTab === "income";
        const keys = isIncome ? allIncomeKeys : allExpenseKeys;
        const actMap = isIncome ? actuals.income : actuals.expense;
        const items = isIncome ? incomeItems : expenseItems;
        const type = isIncome ? "income" : "expense";

        return (
          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            {keys.length === 0 && items.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center" }}>
                <p style={{ fontSize: 36, marginBottom: 12 }}>{isIncome ? "📈" : "📉"}</p>
                <p style={{ fontSize: 14, color: "#8E8E93" }}>No {activeTab} data yet. Add a budget line or connect a data source.</p>
              </div>
            ) : keys.map((cat, i) => {
              const actual  = actMap[cat] ?? 0;
              const lineItem = items.find(l => l.category === cat);
              const planned  = lineItem?.planned ?? 0;
              const pct      = planned > 0 ? Math.min((actual / planned) * 100, 100) : 0;
              const over     = planned > 0 && actual > planned;

              return (
                <div key={cat} style={{ padding: "16px 20px", borderBottom: i < keys.length - 1 ? "1px solid #F5F5F7" : "none", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F" }}>{cat}</span>
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        {planned > 0 && <span style={{ fontSize: 12, color: "#8E8E93" }}>Budget: ${planned.toLocaleString()}</span>}
                        <span style={{ fontSize: 14, fontWeight: 700, color: over ? "#FF3B30" : isIncome ? "#007AFF" : "#5856D6" }}>
                          ${actual.toLocaleString()}{over && " ⚠"}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 8, background: "#F0F0F0", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: isIncome ? (pct >= 100 ? "#34C759" : "#007AFF") : (over ? "#FF3B30" : pct > 75 ? "#FF9500" : "#5856D6"), borderRadius: 4, transition: "width 0.4s" }} />
                    </div>
                    {planned > 0 && <p style={{ fontSize: 11, color: over ? "#FF3B30" : "#8E8E93", margin: "4px 0 0" }}>{pct.toFixed(0)}% of budget used{over ? " — over budget" : ""}</p>}
                  </div>
                  {lineItem && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => startEdit(lineItem)} style={{ background: "#F5F5F7", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer", color: "#1D1D1F" }}>Edit</button>
                      <button onClick={() => deleteLine(lineItem.id)} disabled={deleting === lineItem.id}
                        style={{ background: "transparent", color: "#FF3B30", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>
                        {deleting === lineItem.id ? "…" : "✕"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
