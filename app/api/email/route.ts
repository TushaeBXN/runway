// GET  /api/email  — list ingested emails with filters
// POST /api/email  — update status, add note, draft reply
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { draftReply } from "@/lib/emailIngestion";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const url = new URL(req.url);
  const category = url.searchParams.get("category") ?? undefined;
  const status   = url.searchParams.get("status") ?? undefined;
  const priority = url.searchParams.get("priority") ?? undefined;
  const limit    = parseInt(url.searchParams.get("limit") ?? "50");

  const emails = await prisma.ingestedEmail.findMany({
    where: {
      userId,
      ...(category ? { category } : {}),
      ...(status   ? { status }   : {}),
      ...(priority ? { priority } : {}),
    },
    orderBy: [{ priority: "asc" }, { receivedAt: "desc" }],
    take: limit,
  });

  // Counts by status for the sidebar
  const counts = await prisma.ingestedEmail.groupBy({
    by: ["status"],
    where: { userId },
    _count: true,
  });

  const categoryCounts = await prisma.ingestedEmail.groupBy({
    by: ["category"],
    where: { userId, status: { not: "archived" } },
    _count: true,
  });

  return NextResponse.json({ emails, counts, categoryCounts });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  if (body.action === "update_status") {
    await prisma.ingestedEmail.updateMany({
      where: { id: body.id, userId },
      data: { status: body.status, ...(body.notes ? { notes: body.notes } : {}) },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "draft_reply") {
    const result = await draftReply(body.id, userId);
    return NextResponse.json(result);
  }

  if (body.action === "add_note") {
    await prisma.ingestedEmail.updateMany({ where: { id: body.id, userId }, data: { notes: body.notes } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
