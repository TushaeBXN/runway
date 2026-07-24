// Maps agent payloads → CSV string

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return [];
}
function escapeCell(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
function row(...cells: string[]): string {
  return cells.map(escapeCell).join(",");
}

export interface CSVPayload {
  filename: string;
  csv: string;
}

export function buildActionItemsCSV(payload: Record<string, unknown>): CSVPayload {
  const actions = Array.isArray(payload.actionItems) ? payload.actionItems : [];
  const lines = [row("Task", "Owner", "Due Date", "Status")];
  for (const a of actions as Array<{ task?: string; owner?: string; dueDate?: string }>) {
    lines.push(row(str(a.task), str(a.owner ?? "TBD"), str(a.dueDate ?? "TBD"), "Open"));
  }
  if (arr(payload.keyDecisions).length) {
    lines.push("");
    lines.push(row("Key Decisions"));
    for (const d of arr(payload.keyDecisions)) lines.push(row(d));
  }
  return { filename: "action-items.csv", csv: lines.join("\n") };
}

export function buildDonorSummaryCSV(payload: Record<string, unknown>): CSVPayload {
  const lines = [
    row("Metric", "Value"),
    row("Total Donors", str(payload.totalDonors)),
    row("Total Revenue", str(payload.totalRevenue)),
    row("Retention Rate", str(payload.retentionRate)),
    "",
    row("Key Insights"),
  ];
  for (const i of arr(payload.keyInsights)) lines.push(row(i));
  lines.push("", row("Recommendations"));
  for (const r of arr(payload.recommendations)) lines.push(row(r));
  return { filename: "donor-summary.csv", csv: lines.join("\n") };
}

export function buildGeneralCSV(payload: Record<string, unknown>): CSVPayload {
  const lines = [row("Category", "Item")];
  for (const p of arr(payload.keyPoints)) lines.push(row("Key Point", p));
  for (const i of arr(payload.actionableInsights)) lines.push(row("Insight", i));
  for (const r of arr(payload.recommendations)) lines.push(row("Recommendation", r));
  return { filename: "summary.csv", csv: lines.join("\n") };
}

export function buildGrantCSV(payload: Record<string, unknown>): CSVPayload {
  const lines = [
    row("Field", "Value"),
    row("Grant", str(payload.title || payload.topPick)),
    row("Funder", str(payload.funder)),
    row("Amount", str(payload.amount)),
    row("Deadline", str(payload.deadline)),
    row("Mission Fit", str(payload.missionFit) ? `${payload.missionFit}/10` : ""),
    "",
    row("KPIs"),
  ];
  for (const k of arr(payload.kpis)) lines.push(row(k));
  lines.push("", row("Next Steps"));
  for (const s of arr(payload.nextSteps)) lines.push(row(s));
  return { filename: "grant-strategy.csv", csv: lines.join("\n") };
}

export function buildFinancialReportCSV(payload: Record<string, unknown>): CSVPayload {
  const lines = [row("Period", str(payload.period)), ""];
  lines.push(row("REVENUE", ""));
  const revenue = Array.isArray(payload.revenue) ? payload.revenue : [];
  for (const r of revenue as Array<{ source?: string; amount?: string }>) lines.push(row(str(r.source), str(r.amount)));
  lines.push(row("TOTAL REVENUE", str(payload.totalRevenue)), "");
  lines.push(row("EXPENSES", "Deductible?"));
  const expenses = Array.isArray(payload.expenses) ? payload.expenses : [];
  for (const e of expenses as Array<{ category?: string; amount?: string; deductible?: boolean }>) {
    lines.push(row(str(e.category), str(e.amount), e.deductible ? "Yes" : "No"));
  }
  lines.push(row("TOTAL EXPENSES", str(payload.totalExpenses)), "");
  lines.push(row("NET PROFIT", str(payload.netProfit)));
  lines.push(row("CASH POSITION", str(payload.cashPosition)), "");
  lines.push(row("TAX NOTES"));
  for (const n of arr(payload.taxNotes)) lines.push(row(n));
  return { filename: "financial-report.csv", csv: lines.join("\n") };
}

export function buildInventoryCSV(payload: Record<string, unknown>): CSVPayload {
  const lines = [row("Item", "Current Stock", "Reorder Point", "Supplier")];
  const lowStock = Array.isArray(payload.lowStock) ? payload.lowStock : [];
  for (const i of lowStock as Array<{ item?: string; currentStock?: string; reorderPoint?: string; supplier?: string }>) {
    lines.push(row(str(i.item), str(i.currentStock), str(i.reorderPoint), str(i.supplier || "TBD")));
  }
  lines.push("", row("PENDING ORDERS", "", "", ""));
  lines.push(row("Item", "Qty", "Status", "ETA"));
  const pending = Array.isArray(payload.pendingOrders) ? payload.pendingOrders : [];
  for (const o of pending as Array<{ item?: string; qty?: string; status?: string; eta?: string }>) {
    lines.push(row(str(o.item), str(o.qty), str(o.status), str(o.eta || "TBD")));
  }
  return { filename: "inventory-report.csv", csv: lines.join("\n") };
}

export function payloadToCSV(
  actionType: string,
  payload: Record<string, unknown>
): CSVPayload | null {
  switch (actionType) {
    case "action_items":      return buildActionItemsCSV(payload);
    case "donor_summary":     return buildDonorSummaryCSV(payload);
    case "grant_strategy":    return buildGrantCSV(payload);
    case "financial_report":  return buildFinancialReportCSV(payload);
    case "inventory_report":  return buildInventoryCSV(payload);
    case "general_summary":
    case "financial_summary": return buildGeneralCSV(payload);
    default: return null;
  }
}
