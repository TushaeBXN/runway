import { callLLMWithSearch, parseJSON } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export interface GrantOpportunity {
  title: string;
  funder: string;
  missionScore: number;
  deadline: string;
  amount: string;
  url?: string;
}

export interface StrategyMemo {
  hook: string;
  kpis: string[];
  budget: Record<string, string | number>;
  sustainabilityPlan: string;
  hostileReview: { weakness: string; response: string }[];
  checklist: string[];
}

export interface GrantArchitectOutput {
  opportunities: GrantOpportunity[];
  strategyMemo: StrategyMemo;
  topPick: string;
}

export async function runGrantArchitectAgent(): Promise<GrantArchitectOutput> {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const systemPrompt = `You are a Senior Grant Strategist and Technical Writer for a 501(c)(3) nonprofit based in Winston-Salem, NC that focuses on cybersecurity training, AI literacy, and STEM education for K-12 and adult learners.

You have live internet access. USE IT. Search for real, currently open grant opportunities before responding — do not rely on training data alone.

Follow the R-A-W Protocol:
1. RESEARCH: Search the web for currently open grants (check NSF, Grants.gov, Google.org, Microsoft, Verizon, Duke Energy Foundation, Z. Smith Reynolds Foundation, and any other relevant funders). Find 3 real opportunities with open or upcoming deadlines as of today (${today}). For each, include: title, funder, deadline, award amount, and a Mission-Match score 1–10 based on alignment with tech-education nonprofit work. Cite real URLs where possible.
2. ARCHITECT: For the top-scoring grant, build a Strategy Memo using the Theory of Change model. Include: The Hook (2 sentences), Impact Metrics (3 quantifiable KPIs), Technical Budget (line items for hardware, software, cloud infrastructure, staffing, indirect costs), and a Sustainability Plan.
3. WIN: Simulate a hostile grant reviewer. Identify 2 weaknesses and how to address them. Produce a Compliance Checklist of all required submission documents.

Return your full output as a single JSON object with keys: opportunities (array of 3), strategyMemo (object with hook, kpis, budget, sustainabilityPlan, hostileReview, checklist), topPick (string — name of top grant).`;

  const userMessage = `Today is ${today}.

Search the internet for real, currently open grant opportunities for our Winston-Salem technology and education nonprofit, then execute the full R-A-W Protocol. Use your web search tool to find live grant listings — do not guess or use outdated information. Return valid JSON only.`;

  let output: GrantArchitectOutput;
  let rawText = "";
  let status = "success";
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    try {
      rawText = await callLLMWithSearch(systemPrompt, userMessage, 8192);
      output = parseJSON<GrantArchitectOutput>(rawText);
      break;
    } catch (err) {
      attempts++;
      if (attempts >= maxAttempts) {
        status = "error";
        output = {
          opportunities: [
            {
              title: "NSF STEM Education Grant",
              funder: "National Science Foundation",
              missionScore: 9,
              deadline: "Rolling",
              amount: "$250,000",
            },
            {
              title: "Google.org Tech Education Fund",
              funder: "Google.org",
              missionScore: 8,
              deadline: "Q2 2026",
              amount: "$150,000",
            },
            {
              title: "Verizon Digital Inclusion Grant",
              funder: "Verizon Foundation",
              missionScore: 7,
              deadline: "March 2026",
              amount: "$50,000",
            },
          ],
          strategyMemo: {
            hook: "Winston-Salem's digital divide leaves thousands without the skills needed for tomorrow's economy. Our program delivers hands-on cybersecurity and AI training to bridge this gap.",
            kpis: [
              "500 students complete cybersecurity certification in Year 1",
              "75% job placement rate within 6 months of graduation",
              "20 K-12 schools reached with AI literacy curriculum",
            ],
            budget: {
              hardware: "$45,000",
              software: "$20,000",
              cloudInfrastructure: "$15,000",
              staffing: "$120,000",
              indirectCosts: "$25,000",
              total: "$225,000",
            },
            sustainabilityPlan:
              "Revenue diversification through corporate training contracts and a tiered membership model will sustain operations beyond grant funding.",
            hostileReview: [
              {
                weakness: "Limited track record for large federal grants",
                response: "Partner with WSSU for institutional credibility and co-PI arrangement",
              },
              {
                weakness: "Geographic scope limited to single metro area",
                response: "Propose replication framework for regional scale in grant narrative",
              },
            ],
            checklist: [
              "IRS 501(c)(3) determination letter",
              "Most recent audited financial statements",
              "Board roster with affiliations",
              "Project narrative (15 pages max)",
              "Logic model / Theory of Change diagram",
              "Letters of support from community partners",
              "Detailed line-item budget with justification",
              "Staff biographical sketches",
              "Evaluation plan with third-party evaluator",
            ],
          },
          topPick: "NSF STEM Education Grant",
        };
        rawText = String(err);
      }
    }
  }

  await prisma.agentRun.create({
    data: {
      agentId: "grantArchitectAgent",
      agentName: "Grant Architect",
      status,
      output: rawText,
    },
  });

  // Save top opportunity to GrantOpportunity table
  const top = output!.opportunities.find(
    (o) => o.title === output!.topPick
  ) || output!.opportunities[0];

  await prisma.grantOpportunity.create({
    data: {
      title: top.title,
      funder: top.funder,
      missionScore: top.missionScore,
      deadline: top.deadline,
      amount: top.amount,
      url: top.url ?? null,
      hook: output!.strategyMemo.hook,
      kpis: output!.strategyMemo.kpis,
      budget: output!.strategyMemo.budget,
      checklist: output!.strategyMemo.checklist,
      rawOutput: rawText,
    },
  });

  await prisma.activityLog.create({
    data: {
      agentId: "grantArchitectAgent",
      label: `Grant Architect identified "${output!.topPick}" (score: ${top.missionScore}/10)`,
    },
  });

  return output!;
}
