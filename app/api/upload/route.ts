export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { parseUploadedFile } from "@/lib/documentParser";
import { analyzeDocument } from "@/lib/documentAgentRouter";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const channelId = formData.get("channelId") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  // Parse text from the file
  const parsed = await parseUploadedFile(buffer, file.name, file.type);

  // Run agent analysis
  const analysis = await analyzeDocument(parsed);

  // Save as a Document record
  const doc = await prisma.document.create({
    data: {
      userId: "system",
      type: analysis.deliverableType,
      title: analysis.title,
      content: JSON.stringify({
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        pageCount: parsed.pageCount,
        category: analysis.category,
        summary: analysis.summary,
        deliverable: analysis.deliverable,
      }),
    },
  });

  // If a channelId was provided, post the result as a channel message
  if (channelId) {
    await prisma.channelMessage.create({
      data: {
        channelId,
        senderId: "documentAnalyst",
        senderType: "agent",
        senderName: "Document Analyst",
        content: `Analyzed **${parsed.fileName}** — ${analysis.summary}`,
        msgType: "approval_card",
        approvalStatus: "pending",
        payload: JSON.stringify({ ...analysis.deliverable, _docId: doc.id, _fileName: parsed.fileName }),
        actionType: analysis.deliverableType,
      },
    });
  }

  return NextResponse.json({ doc, analysis });
}
