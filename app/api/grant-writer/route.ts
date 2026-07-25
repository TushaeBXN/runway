export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callLLM } from "@/lib/llm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const [applications, opportunities] = await Promise.all([
    prisma.grantApplication.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.grantOpportunity.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const statusCounts = await prisma.grantApplication.groupBy({
    by: ["status"],
    where: { userId },
    _count: true,
  });

  return NextResponse.json({ applications, opportunities, statusCounts });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  if (body.action === "create") {
    const app = await prisma.grantApplication.create({
      data: {
        userId,
        funder: body.funder,
        title: body.title,
        amount: body.amount || "",
        deadline: body.deadline || null,
        opportunityId: body.opportunityId || null,
        notes: body.notes || null,
        status: "drafting",
      },
    });
    return NextResponse.json({ ok: true, app });
  }

  if (body.action === "ai_draft") {
    const appData = await prisma.grantApplication.findUnique({ where: { id: body.id } });
    if (!appData || appData.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const orgProfile = await prisma.orgProfile.findUnique({ where: { userId } });
    const businessInfo = await prisma.businessInfo.findUnique({ where: { userId } });

    const orgName  = orgProfile?.orgName  || businessInfo?.businessName || "Our Organization";
    const mission  = orgProfile?.mission  || "serving our community";
    const focus    = orgProfile?.focusAreas || "community development";

    let opportunityContext = "";
    if (appData.opportunityId) {
      const opp = await prisma.grantOpportunity.findUnique({ where: { id: appData.opportunityId } });
      if (opp) {
        opportunityContext = `\n\nGrant opportunity details:\nFunder: ${opp.funder}\nAmount: ${opp.amount}\nHook: ${opp.hook}\nKPIs: ${JSON.stringify(opp.kpis)}`;
      }
    }

    const system = `You are an expert nonprofit grant writer with 20+ years of experience. Write a compelling, complete grant application narrative. Include: Executive Summary, Statement of Need, Project Description, Goals & Objectives, Evaluation Plan, and Organizational Capacity. Be specific, data-driven where possible, and compelling. Write in a professional but human tone.`;

    const user = `Organization: ${orgName}
Mission: ${mission}
Focus Areas: ${focus}
Grant Title: ${appData.title}
Funder: ${appData.funder}
Amount Requested: ${appData.amount}
Deadline: ${appData.deadline || "Not specified"}${opportunityContext}

Write the full grant application narrative.`;

    const draftContent = await callLLM(system, user, 4000);

    const updated = await prisma.grantApplication.update({
      where: { id: body.id },
      data: { draftContent, status: "in_review" },
    });

    return NextResponse.json({ ok: true, app: updated });
  }

  if (body.action === "update") {
    const { id, ...data } = body;
    delete data.action;
    const app = await prisma.grantApplication.update({ where: { id, userId }, data });
    return NextResponse.json({ ok: true, app });
  }

  if (body.action === "delete") {
    await prisma.grantApplication.delete({ where: { id: body.id, userId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
