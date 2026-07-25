// POST /api/email/sync — trigger manual inbox sync for the logged-in user
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ingestEmailsForUser } from "@/lib/emailIngestion";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  try {
    const results = await ingestEmailsForUser(userId);
    const totalStored = results.reduce((s, r) => s + r.stored, 0);
    const totalFetched = results.reduce((s, r) => s + r.fetched, 0);
    return NextResponse.json({ ok: true, results, totalFetched, totalStored });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
