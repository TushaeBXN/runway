import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const grants = await prisma.grantOpportunity.findMany({
    orderBy: { missionScore: "desc" },
  });
  return NextResponse.json(grants);
}
