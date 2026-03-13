import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgName, location, mission, focusAreas, website } = await req.json();
  const userId = (session.user as { id: string }).id;

  await prisma.orgProfile.upsert({
    where: { userId },
    update: {
      orgName,
      location,
      mission,
      focusAreas: JSON.stringify(focusAreas),
      website,
    },
    create: {
      userId,
      orgName,
      location,
      mission,
      focusAreas: JSON.stringify(focusAreas),
      website,
    },
  });

  return NextResponse.json({ ok: true });
}
