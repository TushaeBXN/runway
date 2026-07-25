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
  const project = url.searchParams.get("project") ?? undefined;
  const staffName = url.searchParams.get("staffName") ?? undefined;
  const isVolunteer = url.searchParams.get("isVolunteer");
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      ...(project ? { project: { contains: project } } : {}),
      ...(staffName ? { staffName: { contains: staffName } } : {}),
      ...(isVolunteer !== null && isVolunteer !== undefined ? { isVolunteer: isVolunteer === "true" } : {}),
      ...(fromDate || toDate ? {
        date: {
          ...(fromDate ? { gte: new Date(fromDate) } : {}),
          ...(toDate   ? { lte: new Date(toDate)   } : {}),
        },
      } : {}),
    },
    orderBy: { date: "desc" },
  });

  // Aggregate by project
  const byProject: Record<string, { hours: number; payroll: number; entries: number }> = {};
  for (const e of entries) {
    if (!byProject[e.project]) byProject[e.project] = { hours: 0, payroll: 0, entries: 0 };
    byProject[e.project].hours += e.hours;
    byProject[e.project].payroll += e.hours * (e.hourlyRate ?? 0);
    byProject[e.project].entries++;
  }

  const totalHours   = entries.reduce((s, e) => s + e.hours, 0);
  const totalPayroll = entries.reduce((s, e) => s + e.hours * (e.hourlyRate ?? 0), 0);
  const volunteerHours = entries.filter((e) => e.isVolunteer).reduce((s, e) => s + e.hours, 0);

  return NextResponse.json({ entries, byProject, totalHours, totalPayroll, volunteerHours });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  if (body.action === "add") {
    const { staffName, staffEmail, project, description, hours, date, isVolunteer, hourlyRate } = body;
    if (!staffName || !project || !hours || !date) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    const entry = await prisma.timeEntry.create({
      data: {
        userId, staffName, staffEmail, project, description,
        hours: Number(hours), date: new Date(date),
        isVolunteer: Boolean(isVolunteer),
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
      },
    });
    return NextResponse.json({ ok: true, entry });
  }

  if (body.action === "approve") {
    await prisma.timeEntry.update({ where: { id: body.id, userId }, data: { approved: true } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    await prisma.timeEntry.delete({ where: { id: body.id, userId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
