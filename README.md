# Runway — AI Agent Platform for Nonprofits

Runway is a full-stack web application that gives nonprofit organizations a complete operating system powered by AI agents. Every feature is built around the daily reality of running a mission-driven organization: writing grants, tracking contractors, managing donors, filing compliance paperwork, scheduling social media, and keeping the lights on financially.

---

## Color Scheme & Design Language

Runway uses an Apple-inspired design system — clean, high-contrast, and information-dense without feeling cluttered.

| Role | Color | Usage |
|------|-------|-------|
| **Primary Blue** | `#007AFF` | Buttons, links, active states, progress |
| **Success Green** | `#34C759` | Approved, paid, awarded, on-track |
| **Warning Orange** | `#FF9500` | Approaching deadlines, in-review |
| **Danger Red** | `#FF3B30` | Expired, overdue, urgent, critical |
| **Purple** | `#5856D6` | Vendor, hosted data, secondary accent |
| **Dark Background** | `#1D1D1F` | Sidebars, nav panels |
| **Light Surface** | `#F5F5F7` | Page backgrounds, subtle cards |
| **White** | `#FFFFFF` | Card surfaces, detail panels |
| **Body Text** | `#1D1D1F` | Primary text |
| **Secondary Text** | `#8E8E93` | Labels, metadata, captions |

Typography uses the system font stack (SF Pro on macOS, Segoe UI on Windows, fallback sans-serif). Every interactive element has hover states and transitions at 150ms. Urgency is communicated by colored dots, pill badges, and border highlights — never just text alone.

---

## Features

### AI Agent Team (`/team`)
Your AI workforce. A panel of specialized agents you can message directly in real time via Server-Sent Events. Each agent has a name, role, face, and memory of its domain. Agents can generate content, analyze data, write grants, scout jobs, draft social posts, and post to team channels — all awaiting your approval before taking any external action.

**Agents included:**
- **CEO Agent** — strategic decisions, compliance oversight
- **Marketing Agent** — donor outreach, social media, brand voice
- **Grant Architect Agent** — grant research, application drafting, deadline tracking
- **Inbox Agent** — email triage, routing, response drafting
- **Upwork Scout Agent** — freelance job scouting, proposal generation
- **Bookkeeper Agent** — financial tracking, 1099 monitoring

### AI Grant Writer (`/grant-writer`)
End-to-end grant application management powered by AI.
- Import from scouted `GrantOpportunity` records in one click
- AI writes a full narrative: Executive Summary, Statement of Need, Project Description, Goals & Objectives, Evaluation Plan, Organizational Capacity
- Draft uses your real org profile (mission, focus areas, location)
- Edit the draft inline, redraft with AI, or mark as submitted/awarded/rejected
- Pipeline view: Drafting → In Review → Submitted → Awarded / Rejected

### Client & Donor CRM (`/crm`)
A lightweight but complete relationship management system.
- Contact types: Donor, Volunteer, Partner, Vendor, Board Member
- Interaction log: email, call, meeting, donation, note — each timestamped
- Donation tracking: total raised per contact, last contact date
- Search + type filters
- Auto-calculates `totalDonated` and `lastContact` on every interaction

### Email Ingestion & Smart Inbox (`/inbox`)
Full IMAP email pipeline with AI classification.
- Connects to any IMAP account (Gmail, Outlook, Yahoo, custom)
- Fetches unread emails, classifies each into: grant, donor, support, vendor, compliance, other
- Priority: urgent (deadline < 7 days), normal, low
- Routes urgent and grant/donor/compliance emails to the relevant team channel automatically
- Inbox UI: dark sidebar with live category counts, email list, full email body, AI draft reply, manual reply compose (SMTP), archive, and internal notes
- Deduplication via `accountId + uid` — safe to sync repeatedly

### Tax & Compliance Calendar (`/compliance`)
Never miss a filing deadline.
- Auto-seeds federal tax deadlines based on your entity type (501(c)(3), LLC, S-Corp, C-Corp, Sole Prop, Partnership)
- Deadlines include: 990, Form 1023, BOI Report, 1099-NEC, W-2, quarterly estimates, state filings
- Timeline view grouped by month with urgency colors
- Manual reminders for PO Box, domain renewal, credit monitoring, DUNS

### 1099 Contractor Tracker (`/contractors`)
Stay compliant with IRS 1099-NEC requirements.
- Track all contractors and their payments across the tax year
- Real-time progress bar toward $600 threshold
- Badges: Below threshold → Approaching $600 → 1099 REQUIRED → 1099 Filed
- QuickBooks OAuth sync: pulls vendors and purchases automatically
- Mark 1099 as filed for each contractor

### Gumroad + Reserve Fund (`/reserve-fund`)
Turn product revenue into a financial safety net.
- Connect your Gumroad account via Ping webhook
- Each sale auto-allocates a configurable percentage to the reserve fund
- Manual deposit and withdrawal
- Progress bar toward your target balance
- Full transaction history with source tagging (gumroad vs manual)

### Domain & Hosting Renewal Tracker (`/domains`)
Never let a domain expire.
- Track domains, SSL certs, and hosting plans — each with their own expiry date
- Urgency system: red (< 14d / expired), orange (< 30d), yellow (< 60d), green (safe)
- Auto-seeds BusinessReminder entries in the Compliance Calendar
- Expandable cards with full detail, edit, delete
- "Action Required" alert when any domain is critical or expired

### Social Media Scheduler (`/social`)
Draft, review, and schedule posts across platforms.
- Platforms: Twitter/X, LinkedIn, Facebook, Instagram
- AI draft: give a topic and tone, get a platform-optimized post
- Character limit enforcement per platform (Twitter: 280, LinkedIn: 3000, etc.)
- Approval queue integration: Submit for Approval sends the post to PendingApproval
- Status pipeline: Draft → In Review → Approved → Scheduled → Posted

### Staff & Volunteer Time Tracker (`/time-tracker`)
Log hours and estimate payroll by project.
- Log entries by staff name, project, date, and hours
- Volunteer vs paid distinction — volunteer hours excluded from payroll
- Hourly rate per entry for payroll estimation
- Approval workflow for submitted hours
- Project breakdown view: total hours + estimated payroll per project

### Upwork Job Scout (`/upwork`)
AI-powered freelance job monitoring and proposal generation.
- Scouts for relevant jobs based on your org's skills and focus areas
- Scores each job for fit
- Generates draft proposals

### Grant Opportunities (`/grants`)
Automated grant opportunity discovery.
- Agent scans foundation databases and curates high-fit opportunities
- Each opportunity scored for mission alignment
- Budget breakdown, KPI suggestions, and application checklist generated

### Agent Approvals (team Approvals tab)
Every AI action that has real-world consequences goes through an approval queue.
- Email drafts, social posts, job deliverables, grant strategies
- Approve or reject with an optional note
- Full payload preview before any action is taken

### Agents Dashboard (`/agents`)
Manage your AI workforce.
- View all agent definitions, performance history, and last run status
- Enable/disable agents, adjust schedule (business hours, off-hours, manual, custom cron)
- Employment types: permanent, temporary, part-time
- Audit log for every agent action

### Hardware Fund (`/hardware-fund`)
Track infrastructure investment toward GPU/compute hardware.
- Milestone tiers from $0 to $20,000+
- Contribution logging with source tracking

### Dashboard (`/dashboard`)
Live operational overview.
- Today's task queue
- Recent agent activity
- Pending approvals requiring your attention
- Quick actions

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Styling** | Tailwind CSS + inline style system |
| **Database** | SQLite via Prisma 7 (Postgres-ready via `@prisma/adapter-pg`) |
| **Auth** | NextAuth.js v4 (credentials provider) |
| **AI / LLM** | Anthropic Claude, OpenAI, Gemini, Ollama, Abacus.ai — switchable via env var |
| **Email (IMAP)** | imapflow |
| **Email (SMTP)** | nodemailer |
| **Scheduling** | node-cron (background agent scheduler) |
| **Payments** | Gumroad Ping webhook |
| **Accounting** | QuickBooks OAuth 2.0 API |
| **Real-time** | Server-Sent Events (SSE) for the agent team chat |
| **Encryption** | AES-256-GCM for stored credentials |
| **File handling** | pdf-parse for document analysis |

---

## Setup

```bash
# 1. Clone
git clone https://github.com/TushaeBXN/runway.git
cd runway

# 2. Install
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in: NEXTAUTH_SECRET, ANTHROPIC_API_KEY (or other LLM keys)

# 4. Initialize the database
npx prisma db push
npx prisma generate

# 5. Run
npm run dev
```

Open http://localhost:3000 and create your account.

---

## Environment Variables

```env
# Auth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# LLM — pick one or configure per-user in Settings
LLM_PROVIDER=anthropic          # anthropic | openai | gemini | ollama | abacus
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# QuickBooks (optional)
QB_CLIENT_ID=...
QB_CLIENT_SECRET=...
QB_REDIRECT_URI=http://localhost:3000/api/integrations/quickbooks/callback

# Encryption key for stored credentials (32-char hex string)
ENCRYPTION_KEY=your-32-char-hex-key

# Resend (optional transactional email)
RESEND_API_KEY=re_...
```

---

## Project Structure

```
runway/
├── app/                        # Next.js App Router pages
│   ├── api/                    # All API routes (force-dynamic)
│   │   ├── agents/             # Agent management + run trigger
│   │   ├── compliance/         # Tax calendar + reminders
│   │   ├── contractors/        # 1099 tracker
│   │   ├── crm/                # Contact + interaction management
│   │   ├── domains/            # Domain + hosting tracker
│   │   ├── email/              # Inbox management + SMTP send
│   │   ├── grant-writer/       # Grant applications + AI drafting
│   │   ├── integrations/       # QuickBooks OAuth
│   │   ├── reserve-fund/       # Reserve fund + Gumroad webhook
│   │   ├── social/             # Social post management + AI draft
│   │   ├── team/               # SSE agent chat stream
│   │   ├── time-tracker/       # Staff + volunteer hours
│   │   └── webhooks/           # Gumroad Ping
│   ├── grant-writer/           # Grant Writer UI
│   ├── crm/                    # Donor & Contact CRM UI
│   ├── domains/                # Domain tracker UI
│   ├── inbox/                  # Smart email inbox UI
│   ├── social/                 # Social scheduler UI
│   ├── time-tracker/           # Time tracker UI
│   ├── compliance/             # Compliance calendar UI
│   ├── contractors/            # 1099 tracker UI
│   ├── reserve-fund/           # Reserve fund UI
│   └── team/                   # AI agent team chat UI
├── lib/
│   ├── agents/                 # Individual agent implementations
│   ├── email.ts                # IMAP fetch + SMTP send
│   ├── emailIngestion.ts       # Email classification pipeline
│   ├── llm.ts                  # Unified LLM client (all providers)
│   ├── contractorUtils.ts      # 1099 threshold recalculation
│   ├── taxDeadlines.ts         # Federal deadline seed data
│   ├── quickbooks.ts           # QB OAuth + API helpers
│   ├── scheduler.ts            # node-cron background runner
│   └── prisma.ts               # Prisma client singleton
├── prisma/
│   └── schema.prisma           # Full database schema
└── components/
    └── Nav.tsx                 # Top navigation
```

---

## Roadmap

**Phase 2 — Scale**
- [ ] Multi-user / team accounts with role-based permissions
- [ ] Postgres migration for production hosting
- [ ] Stripe subscription billing
- [ ] Mobile-responsive layout + PWA manifest
- [ ] Twilio SMS for deadline alerts
- [ ] Zapier / webhook outbound triggers

**Phase 3 — Intelligence**
- [ ] Agent memory with vector embeddings (pgvector / AnthosVec)
- [ ] Automated grant submission via e-filing integrations
- [ ] Donor propensity scoring
- [ ] Budget vs actuals forecasting
- [ ] AI-generated monthly board reports

**Phase 4 — Ecosystem**
- [ ] Salesforce Nonprofit Success Pack sync
- [ ] Mailchimp / Constant Contact integration
- [ ] DocuSign for grant agreements
- [ ] Plaid for bank reconciliation
- [ ] Public API for third-party integrations

---

## Why Runway?

Most nonprofit software is either:

1. **Too generic** — built for for-profits, missing mission-critical workflows
2. **Too expensive** — Salesforce NPSP, Bloomerang, and Raiser's Edge price out small orgs
3. **Too siloed** — separate tools for grants, donors, compliance, email, and social that never talk to each other

Runway is built from the ground up for the org that has a passionate mission but a lean team. The AI agents don't replace your staff — they multiply what your staff can do.

---

Built by **Brian Tushae Thomas** · [Anthos Intelligence](https://github.com/TushaeBXN)
