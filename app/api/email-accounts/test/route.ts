export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { testConnection } from "@/lib/email";

export async function POST(req: Request) {
  // Note: test endpoint receives plain-text password (not yet encrypted)
  // because the user is testing before saving
  const { host, port, username, appPassword } = await req.json();

  if (!host || !username || !appPassword) {
    return NextResponse.json({ ok: false, error: "Missing required fields" });
  }

  const result = await testConnection({ host, port: port || 993, username, appPassword });
  return NextResponse.json(result);
}
