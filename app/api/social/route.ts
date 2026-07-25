export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callLLM } from "@/lib/llm";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const platform = url.searchParams.get("platform") ?? undefined;

  const posts = await prisma.scheduledPost.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
      ...(platform ? { platform } : {}),
    },
    orderBy: [{ status: "asc" }, { scheduledFor: "asc" }, { createdAt: "desc" }],
  });

  const counts = await prisma.scheduledPost.groupBy({
    by: ["status"],
    where: { userId },
    _count: true,
  });

  return NextResponse.json({ posts, counts });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  if (body.action === "create") {
    const post = await prisma.scheduledPost.create({
      data: {
        userId,
        platform: body.platform || "twitter",
        content: body.content || "",
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
        status: "draft",
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ ok: true, post });
  }

  if (body.action === "update") {
    const { id, ...data } = body;
    delete data.action;
    if (data.scheduledFor) data.scheduledFor = new Date(data.scheduledFor);
    const post = await prisma.scheduledPost.update({ where: { id, userId }, data });
    return NextResponse.json({ ok: true, post });
  }

  if (body.action === "delete") {
    await prisma.scheduledPost.delete({ where: { id: body.id, userId } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "ai_draft") {
    const { platform, topic, tone, orgContext } = body;
    const platformLimits: Record<string, number> = { twitter: 280, linkedin: 3000, facebook: 63206, instagram: 2200 };
    const limit = platformLimits[platform] ?? 280;

    const system = `You are a nonprofit social media expert. Write a ${platform} post for a nonprofit organization. Keep it under ${limit} characters. Be authentic, mission-driven, and include a call to action. Return only the post text — no JSON, no explanation, no hashtags explanation.`;
    const user = `Platform: ${platform}\nTone: ${tone || "warm and inspiring"}\nOrg context: ${orgContext || "a nonprofit serving the community"}\nTopic: ${topic}`;

    const content = await callLLM(system, user, 600);
    return NextResponse.json({ ok: true, content: content.trim() });
  }

  if (body.action === "submit_for_approval") {
    const post = await prisma.scheduledPost.findUnique({ where: { id: body.id } });
    if (!post || post.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const approval = await prisma.pendingApproval.create({
      data: {
        agentId: "marketingAgent",
        agentName: "Marketing Agent",
        actionType: "social_post",
        title: `${post.platform.charAt(0).toUpperCase() + post.platform.slice(1)} post`,
        description: post.content.slice(0, 120),
        payload: JSON.stringify({ platform: post.platform, content: post.content, postId: post.id }),
      },
    });

    await prisma.scheduledPost.update({
      where: { id: body.id },
      data: { status: "in_review", approvalId: approval.id },
    });

    return NextResponse.json({ ok: true, approvalId: approval.id });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
