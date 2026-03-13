import { callLLMWithSearch, parseJSON } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export interface MarketResearchOutput {
  businessOverview: string;
  marketAnalysis: {
    marketSize: string;
    growthDrivers: string[];
    segments: string[];
  };
  competitiveLandscape: {
    competitors: { name: string; focus: string; pricing: string; differentiator: string }[];
    keyInsight: string;
  };
  aiLeveragePoints: string[];
  firstPriorities: { title: string; description: string; category: string }[];
  summary: string;
}

export async function runMarketResearchAgent(
  orgProfile: {
    orgName: string;
    location: string;
    mission: string;
    focusAreas: string;
    website?: string | null;
  },
  userId: string
): Promise<MarketResearchOutput> {
  const systemPrompt = `You are an expert market research analyst and business strategist.
Your task is to conduct thorough market research for a nonprofit or small business and return a structured JSON report.

You have access to web search — use it to find current, accurate information about:
- The organization's industry and market size
- Key competitors and alternatives
- Current market trends and growth drivers
- AI tools and opportunities relevant to their work

Return ONLY valid JSON matching this exact structure:
{
  "businessOverview": "2-3 sentence overview of the organization and its market position",
  "marketAnalysis": {
    "marketSize": "estimated market size with source/year",
    "growthDrivers": ["driver 1", "driver 2", "driver 3"],
    "segments": ["segment 1", "segment 2", "segment 3"]
  },
  "competitiveLandscape": {
    "competitors": [
      { "name": "Competitor Name", "focus": "what they do", "pricing": "free/paid/pricing model", "differentiator": "their main advantage" }
    ],
    "keyInsight": "1-2 sentence competitive insight"
  },
  "aiLeveragePoints": ["AI opportunity 1", "AI opportunity 2", "AI opportunity 3"],
  "firstPriorities": [
    { "title": "Priority title", "description": "What to do and why", "category": "Engineering|Research|Marketing|Growth|Operations" },
    { "title": "Priority title", "description": "What to do and why", "category": "Engineering|Research|Marketing|Growth|Operations" },
    { "title": "Priority title", "description": "What to do and why", "category": "Engineering|Research|Marketing|Growth|Operations" }
  ],
  "summary": "2-3 sentence executive summary of findings and recommended direction"
}`;

  const userMessage = `Please conduct market research for this organization:

Organization: ${orgProfile.orgName}
Location: ${orgProfile.location}
Mission: ${orgProfile.mission}
Focus Areas: ${orgProfile.focusAreas}
${orgProfile.website ? `Website: ${orgProfile.website}` : ""}

Search for:
1. The current state of their market/industry (size, growth, trends)
2. Key competitors and alternatives in their space
3. AI tools and platforms that could give them a competitive advantage
4. The top 3 highest-impact actions they should take in the next 30 days

Return a complete JSON market research report.`;

  let output: MarketResearchOutput;
  let rawText = "";

  try {
    rawText = await callLLMWithSearch(systemPrompt, userMessage, 8192);
    output = parseJSON<MarketResearchOutput>(rawText);
  } catch (err) {
    console.error("[MarketResearchAgent] LLM call failed:", err);
    // Fallback structure
    output = {
      businessOverview: `${orgProfile.orgName} operates in ${orgProfile.location} with a focus on ${orgProfile.focusAreas}.`,
      marketAnalysis: {
        marketSize: "Data unavailable — please retry",
        growthDrivers: ["Digital transformation", "AI adoption", "Community engagement"],
        segments: ["Nonprofits", "SMBs", "Community organizations"],
      },
      competitiveLandscape: {
        competitors: [
          { name: "General Competitors", focus: "Similar missions", pricing: "Varies", differentiator: "Scale" },
        ],
        keyInsight: "Market research could not be completed. Please retry.",
      },
      aiLeveragePoints: [
        "Automate routine communications",
        "Use AI for grant writing and fundraising",
        "Implement AI-powered data analysis",
      ],
      firstPriorities: [
        {
          title: "Complete market research",
          description: "Retry market research to get accurate competitive intelligence",
          category: "Research",
        },
        {
          title: "Define target audience",
          description: "Document your primary beneficiaries and stakeholders",
          category: "Operations",
        },
        {
          title: "Establish digital presence",
          description: "Ensure website and social media are up to date",
          category: "Marketing",
        },
      ],
      summary: "Market research agent encountered an error. Fallback priorities have been applied.",
    };
  }

  // Save report as a Document
  try {
    await prisma.document.create({
      data: {
        userId,
        type: "market_research",
        title: `Market Research Report — ${orgProfile.orgName}`,
        content: JSON.stringify(output),
      },
    });
  } catch (err) {
    console.error("[MarketResearchAgent] Failed to save document:", err);
  }

  // Create 3 tasks from firstPriorities
  try {
    for (const priority of output.firstPriorities.slice(0, 3)) {
      await prisma.task.create({
        data: {
          userId,
          title: priority.title,
          description: priority.description,
          category: priority.category || "General",
          scheduledFor: "This Week",
          agentId: "marketResearchAgent",
          status: "todo",
        },
      });
    }
  } catch (err) {
    console.error("[MarketResearchAgent] Failed to create tasks:", err);
  }

  // Log agent run
  try {
    await prisma.agentRun.create({
      data: {
        agentId: "marketResearchAgent",
        agentName: "Market Research Agent",
        status: "success",
        output: rawText.slice(0, 5000),
      },
    });
    await prisma.activityLog.create({
      data: {
        agentId: "marketResearchAgent",
        label: `Market Research completed for ${orgProfile.orgName}`,
      },
    });
  } catch (err) {
    console.error("[MarketResearchAgent] Failed to log run:", err);
  }

  return output;
}
