import { callLLM, parseJSON } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export interface MarketingOutput {
  xPost: string;
  linkedInPost: string;
  metaAdCopy: string;
  scheduledTime: string;
}

export async function runMarketingAgent(
  delegatedTask: string
): Promise<MarketingOutput> {
  const systemPrompt = `You are a nonprofit marketing specialist. Based on the CEO's delegated task, draft social media content for X (Twitter) and LinkedIn, and suggest one Meta ad creative. Return JSON with keys: xPost (string, max 280 chars), linkedInPost (string), metaAdCopy (string), scheduledTime (ISO string for next morning 9 AM).`;

  const tomorrow9am = new Date();
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);

  const userMessage = `Delegated task: ${delegatedTask}
Scheduled time for posts: ${tomorrow9am.toISOString()}

Create social media content that promotes our technology and education mission in Winston-Salem, NC.`;

  let output: MarketingOutput;
  let rawText = "";
  let status = "success";

  try {
    rawText = await callLLM(systemPrompt, userMessage, 1024, { taskType: "social_content" });
    output = parseJSON<MarketingOutput>(rawText);
  } catch (err) {
    status = "error";
    output = {
      xPost: "Empowering Winston-Salem with tech education. Join us! #STEM #Education",
      linkedInPost: "We are committed to bridging the digital divide in our community.",
      metaAdCopy: "Learn cybersecurity and AI skills. Free programs available.",
      scheduledTime: tomorrow9am.toISOString(),
    };
    rawText = String(err);
  }

  await prisma.agentRun.create({
    data: {
      agentId: "marketingAgent",
      agentName: "Marketing Agent",
      status,
      output: rawText,
    },
  });

  // Queue for approval — never auto-post
  await prisma.pendingApproval.create({
    data: {
      agentId: "marketingAgent",
      agentName: "Marketing Agent",
      actionType: "social_post",
      title: "Review social media content before posting",
      description: `X post and LinkedIn content drafted for: ${delegatedTask}`,
      payload: JSON.stringify(output),
    },
  });

  await prisma.activityLog.create({
    data: {
      agentId: "marketingAgent",
      label: `Marketing drafted content — waiting for your approval before posting`,
    },
  });

  return output;
}
