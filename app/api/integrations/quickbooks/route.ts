// GET  → returns QB connection status + auth URL
// POST → disconnect
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAuthUrl } from "@/lib/quickbooks";
import crypto from "crypto";

const CLIENT_ID     = process.env.QB_CLIENT_ID ?? "";
const REDIRECT_URI  = `${process.env.NEXTAUTH_URL}/api/integrations/quickbooks/callback`;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const svc = await prisma.connectedService.findFirst({ where: { userId, service: "quickbooks", isActive: true } });
  const connected = !!svc;
  const realmId = svc ? (JSON.parse(svc.credentials) as { realmId?: string }).realmId ?? null : null;

  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = CLIENT_ID ? buildAuthUrl(CLIENT_ID, REDIRECT_URI, state) : null;

  return NextResponse.json({ connected, realmId, authUrl, hasCredentials: !!CLIENT_ID });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { action } = await req.json();

  if (action === "disconnect") {
    await prisma.connectedService.updateMany({ where: { userId, service: "quickbooks" }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
