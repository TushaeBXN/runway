// Maps agent deliverable payloads → PDF section format

interface PDFSection {
  heading?: string;
  body?: string;
  list?: string[];
  table?: Array<{ label: string; value: string }>;
}

export interface PDFPayload {
  title: string;
  meta?: Record<string, string>;
  sections: PDFSection[];
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return [];
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function buildGrantStrategyPDF(payload: Record<string, unknown>): PDFPayload {
  const sections: PDFSection[] = [];

  if (payload.hook) sections.push({ heading: "Why This Grant?", body: str(payload.hook) });
  if (payload.theoryOfChange) sections.push({ heading: "Theory of Change", body: str(payload.theoryOfChange) });
  if (arr(payload.eligibility).length) sections.push({ heading: "Eligibility Requirements", list: arr(payload.eligibility) });
  if (arr(payload.requirements).length) sections.push({ heading: "Grant Requirements", list: arr(payload.requirements) });
  if (arr(payload.kpis).length) sections.push({ heading: "Measurable Outcomes / KPIs", list: arr(payload.kpis) });
  if (arr(payload.nextSteps).length) sections.push({ heading: "Next Steps", list: arr(payload.nextSteps) });
  if (arr(payload.redFlags).length) sections.push({ heading: "Risks & Red Flags", list: arr(payload.redFlags) });

  return {
    title: str(payload.title || payload.topPick) || "Grant Strategy Memo",
    meta: {
      Funder: str(payload.funder),
      "Award Amount": str(payload.amount),
      Deadline: str(payload.deadline),
      "Mission Fit Score": payload.missionFit ? `${payload.missionFit}/10` : "",
    },
    sections,
  };
}

export function buildActionItemsPDF(payload: Record<string, unknown>): PDFPayload {
  const sections: PDFSection[] = [];

  if (payload.summary) sections.push({ heading: "Summary", body: str(payload.summary) });
  if (arr(payload.keyDecisions).length) sections.push({ heading: "Key Decisions", list: arr(payload.keyDecisions) });

  const actions = Array.isArray(payload.actionItems) ? payload.actionItems : [];
  if (actions.length) {
    sections.push({
      heading: "Action Items",
      table: actions.map((a: { task?: string; owner?: string; dueDate?: string }) => ({
        label: `${a.owner ?? "TBD"} · ${a.dueDate ?? "TBD"}`,
        value: a.task ?? "",
      })),
    });
  }

  if (arr(payload.openQuestions).length) sections.push({ heading: "Open Questions", list: arr(payload.openQuestions) });

  return {
    title: str(payload.title) || "Meeting Action Items",
    meta: { Attendees: arr(payload.attendees).join(", "), "Next Meeting": str(payload.nextMeeting) },
    sections,
  };
}

export function buildSocialPostPDF(payload: Record<string, unknown>): PDFPayload {
  const sections: PDFSection[] = [];
  if (payload.xPost) sections.push({ heading: "X / Twitter", body: str(payload.xPost) });
  if (payload.linkedInPost) sections.push({ heading: "LinkedIn", body: str(payload.linkedInPost) });
  if (payload.metaPost) sections.push({ heading: "Meta / Facebook", body: str(payload.metaPost) });
  return { title: "Social Media Content Draft", sections };
}

export function buildEmailPDF(payload: Record<string, unknown>): PDFPayload {
  return {
    title: str(payload.subject) || "Email Draft",
    meta: { To: str(payload.to), Subject: str(payload.subject) },
    sections: [{ heading: "Email Body", body: str(payload.body) }],
  };
}

export function buildGeneralSummaryPDF(payload: Record<string, unknown>, fileName?: string): PDFPayload {
  const sections: PDFSection[] = [];
  if (payload.summary) sections.push({ heading: "Summary", body: str(payload.summary) });
  if (arr(payload.keyPoints).length) sections.push({ heading: "Key Points", list: arr(payload.keyPoints) });
  if (arr(payload.actionableInsights).length) sections.push({ heading: "Actionable Insights", list: arr(payload.actionableInsights) });
  if (arr(payload.recommendations).length) sections.push({ heading: "Recommendations", list: arr(payload.recommendations) });
  return {
    title: str(payload.title) || fileName || "Document Summary",
    meta: { "Document Type": str(payload.documentType) },
    sections,
  };
}

export function buildDonorSummaryPDF(payload: Record<string, unknown>): PDFPayload {
  const sections: PDFSection[] = [];
  if (payload.summary) sections.push({ heading: "Summary", body: str(payload.summary) });
  if (arr(payload.keyInsights).length) sections.push({ heading: "Key Insights", list: arr(payload.keyInsights) });
  if (arr(payload.recommendations).length) sections.push({ heading: "Recommendations", list: arr(payload.recommendations) });
  if (payload.thankYouEmailDraft) sections.push({ heading: "Suggested Thank-You Email", body: str(payload.thankYouEmailDraft) });
  return {
    title: str(payload.title) || "Donor Report Analysis",
    meta: {
      "Total Donors": str(payload.totalDonors),
      "Total Revenue": str(payload.totalRevenue),
      "Retention Rate": str(payload.retentionRate),
    },
    sections,
  };
}

export function buildJobDeliverablePDF(payload: Record<string, unknown>): PDFPayload {
  return {
    title: "Job Deliverable",
    sections: [{ heading: "Deliverable", body: str(payload.deliverable) }],
  };
}

export function buildInventoryReportPDF(payload: Record<string, unknown>): PDFPayload {
  const sections: PDFSection[] = [];
  if (payload.summary) sections.push({ heading: "Status", body: str(payload.summary) });

  const lowStock = Array.isArray(payload.lowStock) ? payload.lowStock : [];
  if (lowStock.length) {
    sections.push({
      heading: "Low Stock Items",
      table: lowStock.map((i: { item?: string; currentStock?: string; reorderPoint?: string; supplier?: string }) => ({
        label: str(i.item),
        value: `Stock: ${str(i.currentStock)} · Reorder at: ${str(i.reorderPoint)} · Supplier: ${str(i.supplier || "TBD")}`,
      })),
    });
  }
  const pending = Array.isArray(payload.pendingOrders) ? payload.pendingOrders : [];
  if (pending.length) {
    sections.push({
      heading: "Pending Orders",
      table: pending.map((o: { item?: string; qty?: string; status?: string; eta?: string }) => ({
        label: str(o.item),
        value: `Qty: ${str(o.qty)} · Status: ${str(o.status)} · ETA: ${str(o.eta || "TBD")}`,
      })),
    });
  }
  if (arr(payload.recommendations).length) sections.push({ heading: "Recommendations", list: arr(payload.recommendations) });
  if (payload.supplierNote) sections.push({ heading: "Supplier Note", body: str(payload.supplierNote) });

  return { title: "Logistics & Inventory Report", sections };
}

export function buildSupportResponsePDF(payload: Record<string, unknown>): PDFPayload {
  const sections: PDFSection[] = [];
  if (payload.customerIssue) sections.push({ heading: "Customer Issue", body: str(payload.customerIssue) });
  if (payload.resolution) sections.push({ heading: "Resolution Offered", body: str(payload.resolution) });
  sections.push({ heading: "Response Body", body: str(payload.body) });
  if (payload.internalNote) sections.push({ heading: "Internal Note", body: str(payload.internalNote) });
  return {
    title: str(payload.subject) || "Customer Support Response",
    meta: { To: str(payload.to), Subject: str(payload.subject) },
    sections,
  };
}

export function buildFinancialReportPDF(payload: Record<string, unknown>): PDFPayload {
  const sections: PDFSection[] = [];

  const summary = [
    { label: "Total Revenue", value: str(payload.totalRevenue) },
    { label: "Total Expenses", value: str(payload.totalExpenses) },
    { label: "Net Profit", value: str(payload.netProfit) },
    { label: "Cash Position", value: str(payload.cashPosition) },
  ].filter((r) => r.value);
  if (summary.length) sections.push({ heading: "Summary", table: summary });

  const revenue = Array.isArray(payload.revenue) ? payload.revenue : [];
  if (revenue.length) {
    sections.push({
      heading: "Revenue Breakdown",
      table: revenue.map((r: { source?: string; amount?: string }) => ({ label: str(r.source), value: str(r.amount) })),
    });
  }
  const expenses = Array.isArray(payload.expenses) ? payload.expenses : [];
  if (expenses.length) {
    sections.push({
      heading: "Expense Breakdown",
      table: expenses.map((e: { category?: string; amount?: string; deductible?: boolean }) => ({
        label: str(e.category) + (e.deductible ? " ✓" : ""),
        value: str(e.amount),
      })),
    });
  }
  if (arr(payload.taxNotes).length) sections.push({ heading: "Tax Notes", list: arr(payload.taxNotes) });
  if (arr(payload.recommendations).length) sections.push({ heading: "Recommendations", list: arr(payload.recommendations) });
  if (payload.projections) sections.push({ heading: "Projections", body: str(payload.projections) });

  return {
    title: `Financial Report — ${str(payload.period) || "Current Period"}`,
    meta: {
      "Total Revenue": str(payload.totalRevenue),
      "Total Expenses": str(payload.totalExpenses),
      "Net Profit": str(payload.netProfit),
    },
    sections,
  };
}

export function payloadToPDF(
  actionType: string,
  payload: Record<string, unknown>
): PDFPayload {
  switch (actionType) {
    case "grant_strategy":    return buildGrantStrategyPDF(payload);
    case "action_items":      return buildActionItemsPDF(payload);
    case "social_post":       return buildSocialPostPDF(payload);
    case "email":             return buildEmailPDF(payload);
    case "donor_summary":     return buildDonorSummaryPDF(payload);
    case "job_deliverable":   return buildJobDeliverablePDF(payload);
    case "inventory_report":  return buildInventoryReportPDF(payload);
    case "support_response":  return buildSupportResponsePDF(payload);
    case "financial_report":  return buildFinancialReportPDF(payload);
    default:                  return buildGeneralSummaryPDF(payload);
  }
}
