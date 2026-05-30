export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { testConnection } from "@/lib/email";

export async function POST(req: Request) {
  const { host, port, username, appPassword } = await req.json();
  const result = await testConnection({ host, port: port || 993, username, appPassword });
  return NextResponse.json(result);
}
