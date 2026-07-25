// Authoritative federal + common state tax deadlines by entity type.
// All dates assume calendar fiscal year (Jan 1 – Dec 31).
// dueDate format: "MM-DD" (annual/quarterly) — matches BusinessReminder.dueDate

export type EntityType =
  | "Nonprofit 501(c)(3)"
  | "Nonprofit 501(c)(4)"
  | "LLC"
  | "S-Corp"
  | "C-Corp"
  | "Sole Proprietor"
  | "Partnership";

export interface TaxDeadline {
  label: string;
  type: string;       // matches BusinessReminder.type values
  dueDate: string;    // "MM-DD"
  recurrence: "annual" | "quarterly" | "monthly" | "once";
  notes: string;
  amount?: number;    // suggested reserve amount
  isFederal: boolean;
  urgencyTier?: "critical" | "high" | "medium"; // overrides automatic urgency
}

// ── Shared deadlines that apply to ALL entity types ───────────────────────

const SHARED: TaxDeadline[] = [
  {
    label: "1099-NEC — File with IRS & Send to Contractors",
    type: "tax_federal",
    dueDate: "01-31",
    recurrence: "annual",
    notes: "Form 1099-NEC due to both contractors and IRS by Jan 31. E-file via FIRE system or a 1099 service. Contractors paid $600+ during the year must receive a copy.",
    isFederal: true,
    urgencyTier: "critical",
  },
  {
    label: "W-2 — File with SSA & Distribute to Employees",
    type: "tax_federal",
    dueDate: "01-31",
    recurrence: "annual",
    notes: "W-2 forms due to employees and SSA by Jan 31. File W-3 transmittal with Social Security Administration.",
    isFederal: true,
    urgencyTier: "critical",
  },
  {
    label: "BOI Report — FinCEN Beneficial Ownership",
    type: "state_filing",
    dueDate: "01-01",
    recurrence: "annual",
    notes: "Corporate Transparency Act: file Beneficial Ownership Information with FinCEN at fincen.gov/boi. Existing companies: initial report due Jan 1, 2025. Updates required within 30 days of ownership changes.",
    isFederal: true,
    urgencyTier: "high",
  },
];

// ── Quarterly estimated tax payment dates ─────────────────────────────────

const QUARTERLY_ESTIMATES: TaxDeadline[] = [
  { label: "Q1 Estimated Tax Payment (Jan–Mar income)", type: "tax_quarterly", dueDate: "04-15", recurrence: "quarterly", notes: "IRS Form 1040-ES / 1120-W. Pay via IRS Direct Pay or EFTPS. Underpayment penalty applies if you owe $1,000+ at year-end.", isFederal: true, urgencyTier: "high" },
  { label: "Q2 Estimated Tax Payment (Apr–May income)", type: "tax_quarterly", dueDate: "06-15", recurrence: "quarterly", notes: "IRS Form 1040-ES / 1120-W. Note: only 2 months of income covered in Q2.", isFederal: true, urgencyTier: "high" },
  { label: "Q3 Estimated Tax Payment (Jun–Aug income)", type: "tax_quarterly", dueDate: "09-15", recurrence: "quarterly", notes: "IRS Form 1040-ES / 1120-W. Pay via IRS Direct Pay or EFTPS.", isFederal: true, urgencyTier: "high" },
  { label: "Q4 Estimated Tax Payment (Sep–Dec income)", type: "tax_quarterly", dueDate: "01-15", recurrence: "quarterly", notes: "IRS Form 1040-ES / 1120-W. Alternative: file full return by Jan 31 to skip this payment.", isFederal: true, urgencyTier: "high" },
];

// ── Payroll tax (quarterly Form 941) ─────────────────────────────────────

const PAYROLL_QUARTERLY: TaxDeadline[] = [
  { label: "Q1 Payroll Tax — Form 941 (Jan–Mar)", type: "tax_federal", dueDate: "04-30", recurrence: "quarterly", notes: "IRS Form 941 — report federal income tax withheld + Social Security/Medicare. Deposit taxes per schedule (monthly or semi-weekly).", isFederal: true, urgencyTier: "high" },
  { label: "Q2 Payroll Tax — Form 941 (Apr–Jun)", type: "tax_federal", dueDate: "07-31", recurrence: "quarterly", notes: "IRS Form 941 quarterly payroll tax return.", isFederal: true, urgencyTier: "high" },
  { label: "Q3 Payroll Tax — Form 941 (Jul–Sep)", type: "tax_federal", dueDate: "10-31", recurrence: "quarterly", notes: "IRS Form 941 quarterly payroll tax return.", isFederal: true, urgencyTier: "high" },
  { label: "Q4 Payroll Tax — Form 941 (Oct–Dec)", type: "tax_federal", dueDate: "01-31", recurrence: "quarterly", notes: "IRS Form 941 quarterly payroll tax return. Also file Form 940 (FUTA) by Jan 31.", isFederal: true, urgencyTier: "high" },
];

// ── Entity-specific deadlines ─────────────────────────────────────────────

const ENTITY_DEADLINES: Record<EntityType, TaxDeadline[]> = {
  "Nonprofit 501(c)(3)": [
    {
      label: "Form 990-EZ Annual Information Return",
      type: "tax_federal",
      dueDate: "05-15",
      recurrence: "annual",
      notes: "IRS Form 990-EZ (or 990-N for orgs with <$50K gross receipts, or full 990 for >$200K). Due 15th day of 5th month after fiscal year end. Extension: Form 8868 gives 6 extra months (deadline becomes Nov 15). Failure to file 3 years in a row = automatic revocation of tax-exempt status.",
      amount: 0,
      isFederal: true,
      urgencyTier: "critical",
    },
    {
      label: "Form 990 Extended Deadline",
      type: "tax_federal",
      dueDate: "11-15",
      recurrence: "annual",
      notes: "Extended Form 990 deadline if Form 8868 was filed by May 15. This is the FINAL deadline — no second extension available.",
      amount: 0,
      isFederal: true,
      urgencyTier: "critical",
    },
    {
      label: "State Charitable Solicitation Registration",
      type: "state_filing",
      dueDate: "01-31",
      recurrence: "annual",
      notes: "Most states require nonprofits soliciting donations to register with the state AG or charity bureau. Deadline varies by state (check your state's requirements). California: RRF-1 due with Form 990 filing.",
      amount: 50,
      isFederal: false,
      urgencyTier: "high",
    },
    {
      label: "State Tax Exemption Renewal",
      type: "state_filing",
      dueDate: "06-01",
      recurrence: "annual",
      notes: "Some states require annual renewal of state tax-exempt status (separate from federal). California nonprofits file FTB 199 or 199N. Check your state AG website.",
      isFederal: false,
      urgencyTier: "medium",
    },
    {
      label: "Grant & Foundation Reporting Deadlines",
      type: "custom",
      dueDate: "03-31",
      recurrence: "annual",
      notes: "Many foundation grants require annual impact/financial reports. Review all active grant agreements for specific reporting deadlines and set individual reminders per grant.",
      isFederal: false,
      urgencyTier: "high",
    },
  ],

  "Nonprofit 501(c)(4)": [
    {
      label: "Form 990 Annual Information Return",
      type: "tax_federal",
      dueDate: "05-15",
      recurrence: "annual",
      notes: "IRS Form 990 due 15th day of 5th month after fiscal year end. 501(c)(4)s cannot use 990-N. Extension via Form 8868 (6 months). Political activity disclosure may be required.",
      amount: 0,
      isFederal: true,
      urgencyTier: "critical",
    },
    {
      label: "Form 8976 — 501(c)(4) Notice to IRS",
      type: "tax_federal",
      dueDate: "01-31",
      recurrence: "once",
      notes: "New 501(c)(4) organizations must file Form 8976 within 60 days of establishment. One-time filing. $50 fee.",
      amount: 50,
      isFederal: true,
      urgencyTier: "high",
    },
  ],

  "LLC": [
    {
      label: "Schedule C — Personal Income Tax Return",
      type: "tax_federal",
      dueDate: "04-15",
      recurrence: "annual",
      notes: "Single-member LLC income reported on owner's Schedule C (Form 1040). Multi-member LLC files Form 1065 partnership return by March 15.",
      amount: 0,
      isFederal: true,
      urgencyTier: "critical",
    },
    {
      label: "Schedule C — Extended Deadline",
      type: "tax_federal",
      dueDate: "10-15",
      recurrence: "annual",
      notes: "Extended personal return deadline (must file Form 4868 by April 15). Note: extension to file is NOT extension to pay — estimated taxes still due April 15.",
      amount: 0,
      isFederal: true,
      urgencyTier: "high",
    },
    {
      label: "State LLC Annual Report / Statement of Information",
      type: "state_filing",
      dueDate: "03-31",
      recurrence: "annual",
      notes: "Most states require an annual or biennial report for LLCs. California: Statement of Information due within 90 days of formation, then every 2 years. $20 fee. File at bizfileonline.sos.ca.gov.",
      amount: 20,
      isFederal: false,
      urgencyTier: "high",
    },
    {
      label: "State Franchise / LLC Tax",
      type: "tax_federal",
      dueDate: "04-15",
      recurrence: "annual",
      notes: "Many states charge an annual LLC franchise tax or fee. California: $800 minimum franchise tax due by April 15. File Form 568 (California) or equivalent in your state.",
      amount: 800,
      isFederal: false,
      urgencyTier: "critical",
    },
    ...QUARTERLY_ESTIMATES,
  ],

  "S-Corp": [
    {
      label: "Form 1120-S — S-Corporation Tax Return",
      type: "tax_federal",
      dueDate: "03-15",
      recurrence: "annual",
      notes: "IRS Form 1120-S due 15th day of 3rd month after fiscal year end (March 15 for calendar year). Extension: Form 7004 gives 6 months (Sep 15). K-1s must be distributed to shareholders by this date.",
      amount: 0,
      isFederal: true,
      urgencyTier: "critical",
    },
    {
      label: "Form 1120-S — Extended Deadline",
      type: "tax_federal",
      dueDate: "09-15",
      recurrence: "annual",
      notes: "Extended S-Corp return deadline if Form 7004 filed by March 15.",
      amount: 0,
      isFederal: true,
      urgencyTier: "high",
    },
    {
      label: "K-1 Distribution to Shareholders",
      type: "tax_federal",
      dueDate: "03-15",
      recurrence: "annual",
      notes: "Schedule K-1 (Form 1120-S) must be provided to each shareholder by March 15 so they can file personal returns.",
      isFederal: true,
      urgencyTier: "high",
    },
    {
      label: "State Corporate Tax Return",
      type: "state_filing",
      dueDate: "03-15",
      recurrence: "annual",
      notes: "State S-Corp or income tax return. Many states conform to federal deadline (March 15). California: Form 100S due March 15. File with FTB.",
      isFederal: false,
      urgencyTier: "high",
    },
    ...QUARTERLY_ESTIMATES,
    ...PAYROLL_QUARTERLY,
  ],

  "C-Corp": [
    {
      label: "Form 1120 — C-Corporation Tax Return",
      type: "tax_federal",
      dueDate: "04-15",
      recurrence: "annual",
      notes: "IRS Form 1120 due 15th day of 4th month after fiscal year end (April 15 for calendar year). Extension: Form 7004 gives 6 months (Oct 15).",
      amount: 0,
      isFederal: true,
      urgencyTier: "critical",
    },
    {
      label: "Form 1120 — Extended Deadline",
      type: "tax_federal",
      dueDate: "10-15",
      recurrence: "annual",
      notes: "Extended C-Corp return deadline if Form 7004 filed by April 15.",
      isFederal: true,
      urgencyTier: "high",
    },
    {
      label: "State Corporate Income Tax Return",
      type: "state_filing",
      dueDate: "04-15",
      recurrence: "annual",
      notes: "State corporate income tax return. Most states align with federal deadline. California: Form 100 due 15th day of 4th month after fiscal year end. $800 minimum franchise tax.",
      amount: 800,
      isFederal: false,
      urgencyTier: "high",
    },
    {
      label: "Q1 Estimated Tax — C-Corp (Jan–Mar)",
      type: "tax_quarterly",
      dueDate: "04-15",
      recurrence: "quarterly",
      notes: "Form 1120-W corporate estimated tax. C-Corps must pay 25% of estimated annual liability each quarter.",
      isFederal: true,
      urgencyTier: "high",
    },
    {
      label: "Q2 Estimated Tax — C-Corp (Apr–Jun)",
      type: "tax_quarterly",
      dueDate: "06-15",
      recurrence: "quarterly",
      notes: "Form 1120-W corporate estimated tax.",
      isFederal: true,
      urgencyTier: "high",
    },
    {
      label: "Q3 Estimated Tax — C-Corp (Jul–Sep)",
      type: "tax_quarterly",
      dueDate: "09-15",
      recurrence: "quarterly",
      notes: "Form 1120-W corporate estimated tax.",
      isFederal: true,
      urgencyTier: "high",
    },
    {
      label: "Q4 Estimated Tax — C-Corp (Oct–Dec)",
      type: "tax_quarterly",
      dueDate: "12-15",
      recurrence: "quarterly",
      notes: "Form 1120-W corporate estimated tax. Note: C-Corp Q4 is Dec 15, not Jan 15.",
      isFederal: true,
      urgencyTier: "high",
    },
    ...PAYROLL_QUARTERLY,
  ],

  "Sole Proprietor": [
    {
      label: "Form 1040 with Schedule C — Annual Tax Return",
      type: "tax_federal",
      dueDate: "04-15",
      recurrence: "annual",
      notes: "Report all business income/expenses on Schedule C. Self-employment tax (15.3%) applies to net profit. Extension via Form 4868 — taxes still due April 15 even with extension.",
      amount: 0,
      isFederal: true,
      urgencyTier: "critical",
    },
    {
      label: "Form 1040 — Extended Deadline",
      type: "tax_federal",
      dueDate: "10-15",
      recurrence: "annual",
      notes: "Extended personal return deadline. Must file Form 4868 by April 15. Does NOT extend payment deadline.",
      isFederal: true,
      urgencyTier: "high",
    },
    {
      label: "Schedule SE — Self-Employment Tax",
      type: "tax_federal",
      dueDate: "04-15",
      recurrence: "annual",
      notes: "Self-employment tax of 15.3% on net earnings from self-employment. Half is deductible on Schedule 1. Filed with Form 1040.",
      isFederal: true,
      urgencyTier: "high",
    },
    ...QUARTERLY_ESTIMATES,
  ],

  "Partnership": [
    {
      label: "Form 1065 — Partnership Return",
      type: "tax_federal",
      dueDate: "03-15",
      recurrence: "annual",
      notes: "IRS Form 1065 due 15th day of 3rd month after fiscal year end (March 15 for calendar year). Extension: Form 7004 gives 6 months (Sep 15). K-1s distributed to all partners by March 15.",
      amount: 0,
      isFederal: true,
      urgencyTier: "critical",
    },
    {
      label: "Form 1065 — Extended Deadline",
      type: "tax_federal",
      dueDate: "09-15",
      recurrence: "annual",
      notes: "Extended partnership return deadline if Form 7004 filed by March 15.",
      isFederal: true,
      urgencyTier: "high",
    },
    {
      label: "K-1 Distribution to Partners",
      type: "tax_federal",
      dueDate: "03-15",
      recurrence: "annual",
      notes: "Schedule K-1 (Form 1065) must be provided to each partner by March 15 so they can file personal returns on time.",
      isFederal: true,
      urgencyTier: "high",
    },
    ...QUARTERLY_ESTIMATES,
  ],
};

export function getDeadlinesForEntity(entityType: string): TaxDeadline[] {
  const mapped = entityType as EntityType;
  const entity = ENTITY_DEADLINES[mapped] ?? [];
  return [...SHARED, ...entity].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

// Returns next occurrence of a MM-DD deadline from today
export function nextDueDate(mmdd: string, referenceDate = new Date()): Date {
  const [month, day] = mmdd.split("-").map(Number);
  const year = referenceDate.getFullYear();
  const candidate = new Date(year, month - 1, day);
  if (candidate <= referenceDate) candidate.setFullYear(year + 1);
  return candidate;
}

export function daysUntil(date: Date, referenceDate = new Date()): number {
  return Math.ceil((date.getTime() - referenceDate.setHours(0, 0, 0, 0)) / 86_400_000);
}

export function urgencyColor(days: number): string {
  if (days < 0)  return "#FF3B30"; // overdue
  if (days <= 14) return "#FF3B30"; // critical — 2 weeks
  if (days <= 30) return "#FF9500"; // orange — 30 days
  if (days <= 60) return "#FFCC00"; // yellow — 60 days
  return "#34C759";                 // green — plenty of time
}

export function urgencyLabel(days: number): string {
  if (days < 0)   return `${Math.abs(days)}d overdue`;
  if (days === 0) return "DUE TODAY";
  if (days === 1) return "DUE TOMORROW";
  return `${days}d away`;
}
