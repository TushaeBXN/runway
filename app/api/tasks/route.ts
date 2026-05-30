export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { title, description, category, scheduledFor, agentId } = await req.json();

  if (!title || !description)
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });

  const task = await prisma.task.create({
    data: {
      userId,
      title,
      description,
      category: category || "General",
      scheduledFor: scheduledFor || "Tonight",
      agentId: agentId || null,
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}
