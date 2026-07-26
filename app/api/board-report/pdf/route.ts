export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { BoardReportPdf } from "@/components/pdf/BoardReportPdf";
import type { BoardReportData } from "@/lib/boardReportData";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data: BoardReportData = await req.json();
  const orgName = data.org?.name ?? "org";

  // Cast needed: renderToBuffer expects DocumentProps but our wrapper passes data as its own props
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(BoardReportPdf, { data }) as any);

  const slug = `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-board-report-${data.reportPeriod}`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
      "Content-Length":      String(buffer.byteLength),
    },
  });
}
