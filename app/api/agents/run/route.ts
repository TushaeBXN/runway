export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { runNightlyLoop } from "@/lib/scheduler";

export async function POST() {
  // Start async — don't await
  runNightlyLoop().catch((err) =>
    console.error("[Runway] Manual run error:", err)
  );

  return NextResponse.json({ status: "started" });
}
