// Maps agent payloads → slide structure for pptxgenjs

export interface SlideContent {
  title: string;
  subtitle?: string;
  bullets?: string[];
  table?: Array<{ label: string; value: string }>;
}

export interface PPTXPayload {
  title: string;
  subtitle?: string;
  slides: SlideContent[];
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return [];
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function buildGrantStrategyPPTX(payload: Record<string, unknown>): PPTXPayload {
  const slides: SlideContent[] = [];

  if (payload.hook) {
    slides.push({ title: "Why This Grant?", bullets: [str(payload.hook)] });
  }
  if (payload.theoryOfChange) {
    slides.push({ title: "Theory of Change", bullets: [str(payload.theoryOfChange)] });
  }
  if (arr(payload.eligibility).length) {
    slides.push({ title: "Eligibility", bullets: arr(payload.eligibility) });
  }
  if (arr(payload.kpis).length) {
    slides.push({ title: "Measurable Outcomes", bullets: arr(payload.kpis) });
  }
  if (arr(payload.nextSteps).length) {
    slides.push({ title: "Next Steps", bullets: arr(payload.nextSteps) });
  }
  if (arr(payload.redFlags).length) {
    slides.push({ title: "Risks & Red Flags", bullets: arr(payload.redFlags) });
  }

  return {
    title: str(payload.title || payload.topPick) || "Grant Strategy",
    subtitle: `${str(payload.funder)} · ${str(payload.amount)} · Deadline: ${str(payload.deadline)}`,
    slides,
  };
}

export function buildDonorSummaryPPTX(payload: Record<string, unknown>): PPTXPayload {
  const slides: SlideContent[] = [];

  slides.push({
    title: "Donor Overview",
    table: [
      { label: "Total Donors", value: str(payload.totalDonors) },
      { label: "Total Revenue", value: str(payload.totalRevenue) },
      { label: "Retention Rate", value: str(payload.retentionRate) },
    ].filter((r) => r.value),
  });

  if (arr(payload.keyInsights).length) {
    slides.push({ title: "Key Insights", bullets: arr(payload.keyInsights) });
  }
  if (arr(payload.recommendations).length) {
    slides.push({ title: "Recommendations", bullets: arr(payload.recommendations) });
  }

  return {
    title: str(payload.title) || "Donor Report",
    subtitle: "Development Office Summary",
    slides,
  };
}

export function buildGeneralSummaryPPTX(payload: Record<string, unknown>): PPTXPayload {
  const slides: SlideContent[] = [];

  if (payload.summary) slides.push({ title: "Summary", bullets: [str(payload.summary)] });
  if (arr(payload.keyPoints).length) slides.push({ title: "Key Points", bullets: arr(payload.keyPoints) });
  if (arr(payload.actionableInsights).length) {
    slides.push({ title: "Actionable Insights", bullets: arr(payload.actionableInsights) });
  }
  if (arr(payload.recommendations).length) {
    slides.push({ title: "Recommendations", bullets: arr(payload.recommendations) });
  }

  return {
    title: str(payload.title) || "Summary",
    subtitle: str(payload.documentType),
    slides,
  };
}

export function payloadToPPTX(
  actionType: string,
  payload: Record<string, unknown>
): PPTXPayload | null {
  switch (actionType) {
    case "grant_strategy": return buildGrantStrategyPPTX(payload);
    case "donor_summary":  return buildDonorSummaryPPTX(payload);
    case "general_summary":
    case "action_items":   return buildGeneralSummaryPPTX(payload);
    default: return null;
  }
}
