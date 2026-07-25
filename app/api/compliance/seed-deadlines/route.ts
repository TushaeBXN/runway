export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDeadlinesForEntity } from "@/lib/taxDeadlines";

// POST /api/compliance/seed-deadlines
// Body: { entityType: string, replace?: boolean }
// Creates BusinessReminder rows for each deadline, skipping duplicates unless replace=true.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { entityType, replace = false } = await req.json();
  if (!entityType) return NextResponse.json({ error: "entityType required" }, { status: 400 });

  const deadlines = getDeadlinesForEntity(entityType);
  if (deadlines.length === 0) return NextResponse.json({ error: "No deadlines found for entity type" }, { status: 400 });

  if (replace) {
    // Remove all auto-seeded deadlines (tax_federal, tax_quarterly, state_filing types)
    await prisma.businessReminder.deleteMany({
      where: { userId, type: { in: ["tax_federal", "tax_quarterly", "state_filing"] } },
    });
  }

  // Get existing labels to avoid duplicates
  const existing = await prisma.businessReminder.findMany({
    where: { userId, isActive: true },
    select: { label: true },
  });
  const existingLabels = new Set(existing.map((r) => r.label));

  const toCreate = deadlines.filter((d) => !existingLabels.has(d.label));

  if (toCreate.length === 0) {
    return NextResponse.json({ ok: true, created: 0, skipped: deadlines.length, message: "All deadlines already exist." });
  }

  await prisma.businessReminder.createMany({
    data: toCreate.map((d) => ({
      userId,
      type: d.type,
      label: d.label,
      dueDate: d.dueDate,
      recurrence: d.recurrence,
      amount: d.amount ?? null,
      notes: d.notes,
      isActive: true,
    })),
  });

  return NextResponse.json({
    ok: true,
    created: toCreate.length,
    skipped: deadlines.length - toCreate.length,
    message: `Seeded ${toCreate.length} deadline${toCreate.length !== 1 ? "s" : ""} for ${entityType}.`,
  });
}
