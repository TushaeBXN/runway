import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

export interface ParsedDocument {
  text: string;
  pageCount?: number;
  fileName: string;
  fileType: string;
  byteSize: number;
}

export async function parseUploadedFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ParsedDocument> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (mimeType === "application/pdf" || ext === "pdf") {
    return parsePDF(buffer, fileName);
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    return parseDOCX(buffer, fileName);
  }
  if (mimeType === "text/plain" || ext === "txt" || ext === "md") {
    return {
      text: buffer.toString("utf-8"),
      fileName,
      fileType: "text",
      byteSize: buffer.byteLength,
    };
  }
  throw new Error(`Unsupported file type: ${mimeType || ext}`);
}

async function parsePDF(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
  // pdf-parse needs a real file path in some environments
  const tmp = join(tmpdir(), `${randomUUID()}.pdf`);
  await writeFile(tmp, buffer);
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return {
      text: result.text,
      pageCount: result.numpages,
      fileName,
      fileType: "pdf",
      byteSize: buffer.byteLength,
    };
  } finally {
    await unlink(tmp).catch(() => null);
  }
}

async function parseDOCX(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    fileName,
    fileType: "docx",
    byteSize: buffer.byteLength,
  };
}
