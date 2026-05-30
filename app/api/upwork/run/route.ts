export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { runOffHoursLoop } from "@/lib/scheduler";

export async function POST() {
  runOffHoursLoop().catch((err) =>
    console.error("[Runway] Manual off-hours run error:", err)
  );
  return NextResponse.json({ status: "started" });
}
