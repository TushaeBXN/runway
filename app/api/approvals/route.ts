export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const approvals = await prisma.pendingApproval.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(approvals);
}
