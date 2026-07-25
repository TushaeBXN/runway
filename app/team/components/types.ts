export interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: string;
  agentId: string | null;
  createdAt: string;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderType: string;
  senderName: string;
  content: string;
  msgType: string;
  approvalStatus: string | null;
  payload: string | null;
  actionType: string | null;
  createdAt: string;
}

export const AGENT_ICONS: Record<string, string> = {
  ceoAgent: "◆",
  marketingAgent: "◈",
  devAgent: "⊞",
  inboxAgent: "✉",
  grantArchitectAgent: "★",
  upworkScoutAgent: "◎",
  jobExecutorAgent: "⚡",
  hardwareFundAgent: "◉",
  marketResearchAgent: "◍",
};

export const ACTION_LABELS: Record<string, string> = {
  social_post:       "Social Post Draft",
  email:             "Email Draft",
  grant_strategy:    "Grant Strategy",
  job_deliverable:   "Deliverable",
  action_items:      "Meeting Action Items",
  donor_summary:     "Donor Report",
  financial_summary: "Financial Summary",
  general_summary:   "Document Analysis",
  inventory_report:  "Inventory & Logistics Report",
  support_response:  "Customer Support Draft",
  financial_report:  "Financial Report (P&L)",
};

export const FACE_CONFIGS: Record<string, { bg: string; eye: string }> = {
  ceoAgent:             { bg: "#1D1D1F", eye: "#0A84FF" },
  marketingAgent:       { bg: "#C0392B", eye: "#FFD60A" },
  grantArchitectAgent:  { bg: "#1A6B35", eye: "#34C759" },
  inboxAgent:           { bg: "#005F8A", eye: "#5AC8FA" },
  devAgent:             { bg: "#3A3A3C", eye: "#30D158" },
  marketResearchAgent:  { bg: "#6A2E9E", eye: "#BF5AF2" },
  upworkScoutAgent:     { bg: "#A04200", eye: "#FF9F0A" },
  jobExecutorAgent:     { bg: "#0A5C70", eye: "#5AC8FA" },
  hardwareFundAgent:    { bg: "#8B3A00", eye: "#FF6B35" },
  documentAnalyst:      { bg: "#3A3A3C", eye: "#8E8E93" },
  logisticsAgent:       { bg: "#5C3A1E", eye: "#FF9F0A" },
  customerSupportAgent: { bg: "#0D5F4F", eye: "#34C759" },
  bookkeepingAgent:     { bg: "#1A3A6E", eye: "#5AC8FA" },
};

export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  ceoAgent: "Marcus", marketingAgent: "Brian", devAgent: "Alex", inboxAgent: "Kelsey",
  grantArchitectAgent: "Diana", upworkScoutAgent: "Tim", jobExecutorAgent: "Jordan",
  hardwareFundAgent: "Chip", marketResearchAgent: "Gerald", documentAnalyst: "Gerald",
  logisticsAgent: "Dwayne", customerSupportAgent: "Kira", bookkeepingAgent: "Kelvin",
};

export const AGENT_ROLE_LABELS: Record<string, string> = {
  ceoAgent: "CEO", marketingAgent: "Marketing", devAgent: "Engineering",
  inboxAgent: "Communications", grantArchitectAgent: "Grants", upworkScoutAgent: "Biz Dev",
  jobExecutorAgent: "Delivery", hardwareFundAgent: "Finance Tracker", marketResearchAgent: "Research",
  documentAnalyst: "Analysis", logisticsAgent: "Logistics", customerSupportAgent: "Support",
  bookkeepingAgent: "Bookkeeping",
};

export const AGENT_VOICE: Record<string, { pitch: number; rate: number; voiceName: string }> = {
  ceoAgent:             { pitch: 0.75, rate: 0.92, voiceName: "Daniel" },
  marketingAgent:       { pitch: 1.15, rate: 1.12, voiceName: "Fred" },
  grantArchitectAgent:  { pitch: 0.88, rate: 0.88, voiceName: "Victoria" },
  inboxAgent:           { pitch: 1.1,  rate: 1.0,  voiceName: "Samantha" },
  devAgent:             { pitch: 1.0,  rate: 1.08, voiceName: "Tom" },
  marketResearchAgent:  { pitch: 0.92, rate: 0.85, voiceName: "Alex" },
  upworkScoutAgent:     { pitch: 1.05, rate: 1.05, voiceName: "Moira" },
  documentAnalyst:      { pitch: 1.0,  rate: 0.9,  voiceName: "Karen" },
  logisticsAgent:       { pitch: 0.78, rate: 0.96, voiceName: "Fred" },
  customerSupportAgent: { pitch: 1.18, rate: 0.98, voiceName: "Samantha" },
  bookkeepingAgent:     { pitch: 0.85, rate: 0.9,  voiceName: "Daniel" },
  jobExecutorAgent:     { pitch: 1.0,  rate: 1.0,  voiceName: "Tom" },
  hardwareFundAgent:    { pitch: 1.1,  rate: 1.0,  voiceName: "Alex" },
};
