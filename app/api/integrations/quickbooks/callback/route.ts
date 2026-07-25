// OAuth callback — exchange code for tokens, store in ConnectedService
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exchangeCode } from "@/lib/quickbooks";

const CLIENT_ID     = process.env.QB_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.QB_CLIENT_SECRET ?? "";
const REDIRECT_URI  = `${process.env.NEXTAUTH_URL}/api/integrations/quickbooks/callback`;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));
  const userId = (session.user as { id: string }).id;

  const url = new URL(req.url);
  const code    = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  const error   = url.searchParams.get("error");

  if (error || !code || !realmId) {
    return NextResponse.redirect(new URL(`/settings?qb=error&reason=${error ?? "missing_params"}`, req.url));
  }

  try {
    const tokens = await exchangeCode(code, REDIRECT_URI, CLIENT_ID, CLIENT_SECRET);
    const credentials = JSON.stringify({ ...tokens, realmId });

    await prisma.connectedService.upsert({
      where: { userId_service: { userId, service: "quickbooks" } } as never,
      update: { credentials, isActive: true, label: "QuickBooks Online" },
      create: { userId, service: "quickbooks", label: "QuickBooks Online", credentials, isActive: true },
    });

    return NextResponse.redirect(new URL("/settings?qb=connected", req.url));
  } catch (err) {
    console.error("[QB OAuth]", err);
    return NextResponse.redirect(new URL("/settings?qb=error&reason=token_exchange", req.url));
  }
}
