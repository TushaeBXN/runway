export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? undefined;
  const search = url.searchParams.get("search") ?? "";

  const contacts = await prisma.contact.findMany({
    where: {
      userId,
      ...(type ? { type } : {}),
      ...(search ? {
        OR: [
          { firstName: { contains: search } },
          { lastName:  { contains: search } },
          { email:     { contains: search } },
          { org:       { contains: search } },
        ],
      } : {}),
    },
    include: { interactions: { orderBy: { occurredAt: "desc" }, take: 5 } },
    orderBy: { updatedAt: "desc" },
  });

  const stats = await prisma.contact.groupBy({
    by: ["type"],
    where: { userId },
    _count: true,
    _sum: { totalDonated: true },
  });

  return NextResponse.json({ contacts, stats });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  if (body.action === "add_contact") {
    const { type, firstName, lastName, email, phone, org, tags, notes } = body;
    if (!firstName || !lastName) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const contact = await prisma.contact.create({
      data: { userId, type: type || "donor", firstName, lastName, email, phone, org, tags, notes },
    });
    return NextResponse.json({ ok: true, contact });
  }

  if (body.action === "update_contact") {
    const { id, ...data } = body;
    delete data.action;
    if (data.lastContact) data.lastContact = new Date(data.lastContact);
    const contact = await prisma.contact.update({ where: { id, userId }, data });
    return NextResponse.json({ ok: true, contact });
  }

  if (body.action === "delete_contact") {
    await prisma.contact.delete({ where: { id: body.id, userId } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "add_interaction") {
    const { contactId, type, summary, amount, occurredAt } = body;
    const interaction = await prisma.contactInteraction.create({
      data: { contactId, type, summary, amount: amount ? Number(amount) : null, occurredAt: occurredAt ? new Date(occurredAt) : new Date() },
    });
    // Update lastContact + totalDonated
    const updates: Record<string, unknown> = { lastContact: new Date() };
    if (type === "donation" && amount) {
      const contact = await prisma.contact.findUnique({ where: { id: contactId } });
      updates.totalDonated = (contact?.totalDonated ?? 0) + Number(amount);
    }
    await prisma.contact.update({ where: { id: contactId }, data: updates });
    return NextResponse.json({ ok: true, interaction });
  }

  if (body.action === "delete_interaction") {
    await prisma.contactInteraction.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
