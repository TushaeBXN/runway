import { callLLM } from "@/lib/llm";
import type { ParsedDocument } from "@/lib/documentParser";

export type DocumentCategory =
  | "grant_rfp"
  | "meeting_notes"
  | "donor_report"
  | "financial_statement"
  | "contract"
  | "general";

export interface DocumentAnalysis {
  category: DocumentCategory;
  title: string;
  summary: string;
  deliverable: Record<string, unknown>;
  deliverableType:
    | "grant_strategy"
    | "action_items"
    | "donor_summary"
    | "financial_summary"
    | "contract_review"
    | "general_summary";
}

// Detect what kind of document this is
async function classifyDocument(text: string): Promise<DocumentCategory> {
  const snippet = text.slice(0, 2000);
  const raw = await callLLM(
    `You are a document classifier. Respond with ONLY one of these exact labels:
grant_rfp, meeting_notes, donor_report, financial_statement, contract, general`,
    `Classify this document:\n\n${snippet}`,
    50
  );
  const label = raw.trim().toLowerCase().replace(/[^a-z_]/g, "") as DocumentCategory;
  const valid: DocumentCategory[] = [
    "grant_rfp",
    "meeting_notes",
    "donor_report",
    "financial_statement",
    "contract",
    "general",
  ];
  return valid.includes(label) ? label : "general";
}

async function analyzeGrantRFP(text: string): Promise<Omit<DocumentAnalysis, "category">> {
  const raw = await callLLM(
    `You are a senior grant strategist for a nonprofit. Analyze this grant RFP and respond with JSON only:
{
  "title": "grant name",
  "funder": "funder organization",
  "deadline": "deadline date or TBD",
  "amount": "funding amount or range",
  "eligibility": ["key eligibility requirement 1", "requirement 2"],
  "missionFit": 8,
  "hook": "one sentence on why this org is a strong fit",
  "requirements": ["deliverable 1", "deliverable 2", "deliverable 3"],
  "theoryOfChange": "2-3 sentence theory of change for this grant",
  "kpis": ["measurable outcome 1", "measurable outcome 2", "measurable outcome 3"],
  "nextSteps": ["immediate action 1", "action 2", "action 3"],
  "redFlags": ["risk or concern if any"],
  "summary": "3-sentence plain-language summary of this opportunity"
}`,
    text.slice(0, 6000),
    2000
  );
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
  } catch {
    parsed = { summary: raw.slice(0, 500) };
  }
  return {
    title: (parsed.title as string) ?? "Grant RFP Analysis",
    summary: (parsed.summary as string) ?? "",
    deliverable: parsed,
    deliverableType: "grant_strategy",
  };
}

async function analyzeMeetingNotes(text: string): Promise<Omit<DocumentAnalysis, "category">> {
  const raw = await callLLM(
    `You are an executive assistant. Extract structured information from these meeting notes and respond with JSON only:
{
  "title": "meeting name and date",
  "attendees": ["person 1", "person 2"],
  "keyDecisions": ["decision 1", "decision 2"],
  "actionItems": [{"task": "task description", "owner": "person name or TBD", "dueDate": "date or TBD"}],
  "openQuestions": ["unresolved question 1"],
  "nextMeeting": "date or TBD",
  "summary": "3-sentence plain-language summary"
}`,
    text.slice(0, 6000),
    2000
  );
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
  } catch {
    parsed = { summary: raw.slice(0, 500) };
  }
  return {
    title: (parsed.title as string) ?? "Meeting Notes Analysis",
    summary: (parsed.summary as string) ?? "",
    deliverable: parsed,
    deliverableType: "action_items",
  };
}

async function analyzeDonorReport(text: string): Promise<Omit<DocumentAnalysis, "category">> {
  const raw = await callLLM(
    `You are a nonprofit development officer. Analyze this donor report and respond with JSON only:
{
  "title": "report title",
  "totalDonors": "number or estimate",
  "totalRevenue": "dollar amount",
  "topDonors": ["donor 1", "donor 2"],
  "retentionRate": "percentage or estimate",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "thankYouEmailDraft": "a warm, personalized thank-you email draft for a major donor",
  "summary": "3-sentence plain-language summary"
}`,
    text.slice(0, 6000),
    2000
  );
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
  } catch {
    parsed = { summary: raw.slice(0, 500) };
  }
  return {
    title: (parsed.title as string) ?? "Donor Report Analysis",
    summary: (parsed.summary as string) ?? "",
    deliverable: parsed,
    deliverableType: "donor_summary",
  };
}

async function analyzeGeneral(text: string, fileName: string): Promise<Omit<DocumentAnalysis, "category">> {
  const raw = await callLLM(
    `You are a strategic analyst. Analyze this document and respond with JSON only:
{
  "title": "document title",
  "documentType": "what kind of document this is",
  "keyPoints": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"],
  "actionableInsights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "summary": "3-sentence plain-language summary"
}`,
    `Document: ${fileName}\n\n${text.slice(0, 6000)}`,
    2000
  );
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
  } catch {
    parsed = { summary: raw.slice(0, 500) };
  }
  return {
    title: (parsed.title as string) ?? fileName,
    summary: (parsed.summary as string) ?? "",
    deliverable: parsed,
    deliverableType: "general_summary",
  };
}

export async function analyzeDocument(doc: ParsedDocument): Promise<DocumentAnalysis> {
  const category = await classifyDocument(doc.text);

  let result: Omit<DocumentAnalysis, "category">;
  switch (category) {
    case "grant_rfp":
      result = await analyzeGrantRFP(doc.text);
      break;
    case "meeting_notes":
      result = await analyzeMeetingNotes(doc.text);
      break;
    case "donor_report":
      result = await analyzeDonorReport(doc.text);
      break;
    default:
      result = await analyzeGeneral(doc.text, doc.fileName);
  }

  return { category, ...result };
}
