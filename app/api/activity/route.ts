import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const logs = await prisma.activityLog.findMany({
    take: 20,
    orderBy: { time: "desc" },
  });
  return NextResponse.json(logs);
}
