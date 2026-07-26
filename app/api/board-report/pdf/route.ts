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

  let data: BoardReportData;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const orgName = data.org?.name ?? "org";
  const slug    = `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-board-report-${data.reportPeriod}`;

  let buffer: Buffer;
  try {
    // Cast needed: renderToBuffer expects DocumentProps but our wrapper uses its own props
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buffer = await renderToBuffer(React.createElement(BoardReportPdf, { data }) as any);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[BoardReport PDF] renderToBuffer failed:", message);
    return NextResponse.json(
      { error: "PDF generation failed", detail: message },
      { status: 500 }
    );
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
      "Content-Length":      String(buffer.byteLength),
    },
  });
}
