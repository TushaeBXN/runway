export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const domains = await prisma.domain.findMany({
    where: { userId },
    orderBy: { expiresAt: "asc" },
  });

  return NextResponse.json({ domains });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  if (body.action === "add") {
    const { name, registrar, registeredAt, expiresAt, autoRenew, sslExpiresAt, hostingProvider, hostingExpiresAt, notes } = body;
    if (!name || !expiresAt) return NextResponse.json({ error: "name and expiresAt required" }, { status: 400 });

    const domain = await prisma.domain.create({
      data: {
        userId,
        name: name.trim().toLowerCase(),
        registrar: registrar || null,
        registeredAt: registeredAt ? new Date(registeredAt) : null,
        expiresAt: new Date(expiresAt),
        autoRenew: Boolean(autoRenew),
        sslExpiresAt: sslExpiresAt ? new Date(sslExpiresAt) : null,
        hostingProvider: hostingProvider || null,
        hostingExpiresAt: hostingExpiresAt ? new Date(hostingExpiresAt) : null,
        notes: notes || null,
      },
    });

    // Auto-seed a BusinessReminder for each expiry date
    await seedReminderIfAbsent(userId, `Domain: ${name}`, expiresAt, "domain");
    if (hostingExpiresAt) {
      await seedReminderIfAbsent(userId, `Hosting: ${hostingProvider || name}`, hostingExpiresAt, "hosting");
    }
    if (sslExpiresAt) {
      await seedReminderIfAbsent(userId, `SSL: ${name}`, sslExpiresAt, "domain");
    }

    return NextResponse.json({ ok: true, domain });
  }

  if (body.action === "update") {
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // Parse date fields
    const update: Record<string, unknown> = {};
    const dateFields = ["expiresAt", "sslExpiresAt", "hostingExpiresAt", "registeredAt"];
    for (const key of Object.keys(data)) {
      if (key === "action") continue;
      if (dateFields.includes(key)) {
        update[key] = data[key] ? new Date(data[key]) : null;
      } else {
        update[key] = data[key];
      }
    }

    const domain = await prisma.domain.update({ where: { id, userId }, data: update });
    return NextResponse.json({ ok: true, domain });
  }

  if (body.action === "delete") {
    await prisma.domain.delete({ where: { id: body.id, userId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function seedReminderIfAbsent(userId: string, label: string, dateStr: string, type: string) {
  const d = new Date(dateStr);
  const mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const exists = await prisma.businessReminder.findFirst({ where: { userId, label, type } });
  if (!exists) {
    await prisma.businessReminder.create({
      data: { userId, type, label, dueDate: mmdd, recurrence: "annual", isActive: true },
    });
  }
}
