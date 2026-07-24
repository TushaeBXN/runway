export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";

const BRAND_DARK = "1D1D1F";
const BRAND_ACCENT = "0A84FF";
const TEXT_BODY = "3A3A3C";
const TEXT_MUTED = "8E8E93";

export async function POST(req: NextRequest) {
  const { title, subtitle, slides } = await req.json() as {
    title: string;
    subtitle?: string;
    slides: Array<{
      title: string;
      bullets?: string[];
      table?: Array<{ label: string; value: string }>;
    }>;
  };

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Runway AI";
  pptx.company = "Runway";
  pptx.subject = title;
  pptx.title = title;

  // ── Cover slide ─────────────────────────────────────────────────────────────
  const cover = pptx.addSlide();
  cover.background = { color: BRAND_DARK };
  cover.addText("RUNWAY", {
    x: 0.6, y: 0.4, w: 8, h: 0.4,
    fontSize: 11, bold: true, color: "FFFFFF", fontFace: "Helvetica",
    charSpacing: 4,
  });
  cover.addText(title, {
    x: 0.6, y: 1.6, w: 11, h: 1.4,
    fontSize: 36, bold: true, color: "FFFFFF", fontFace: "Helvetica",
    breakLine: false,
  });
  if (subtitle) {
    cover.addText(subtitle, {
      x: 0.6, y: 3.1, w: 11, h: 0.5,
      fontSize: 14, color: "8E8E93", fontFace: "Helvetica",
    });
  }
  cover.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 4.6, w: 1.2, h: 0.08,
    fill: { color: BRAND_ACCENT },
    line: { color: BRAND_ACCENT },
  });

  // ── Content slides ───────────────────────────────────────────────────────────
  for (const slide of slides) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };

    // Left accent bar
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.08, h: 5.63,
      fill: { color: BRAND_DARK },
      line: { color: BRAND_DARK },
    });

    // Slide title
    s.addText(slide.title.toUpperCase(), {
      x: 0.4, y: 0.35, w: 12, h: 0.45,
      fontSize: 12, bold: true, color: BRAND_DARK,
      fontFace: "Helvetica", charSpacing: 1.5,
    });

    // Divider
    s.addShape(pptx.ShapeType.rect, {
      x: 0.4, y: 0.88, w: 12.2, h: 0.02,
      fill: { color: "E5E5EA" },
      line: { color: "E5E5EA" },
    });

    if (slide.bullets && slide.bullets.length > 0) {
      const bulletObjs = slide.bullets.map((b) => ({
        text: b,
        options: { bullet: { type: "bullet" as const }, fontSize: 16, color: TEXT_BODY, paraSpaceAfter: 8 },
      }));
      s.addText(bulletObjs, {
        x: 0.5, y: 1.1, w: 12.1, h: 4.0,
        fontFace: "Helvetica", valign: "top",
      });
    }

    if (slide.table && slide.table.length > 0) {
      const tableRows = slide.table.map((r) => [
        { text: r.label, options: { bold: true, color: TEXT_MUTED, fontSize: 11 } },
        { text: r.value, options: { color: BRAND_DARK, fontSize: 13 } },
      ]);
      s.addTable(tableRows, {
        x: 0.5, y: 1.1, w: 12.1,
        colW: [3.5, 8.6],
        border: { type: "solid", pt: 0.5, color: "E5E5EA" },
        fill: { color: "FAFAFA" },
        fontFace: "Helvetica",
      });
    }

    // Footer
    s.addText(`Runway AI · ${title}`, {
      x: 0.4, y: 5.3, w: 12, h: 0.25,
      fontSize: 8, color: "C7C7CC", fontFace: "Helvetica",
    });
  }

  const buffer = Buffer.from((await pptx.write({ outputType: "nodebuffer" })) as ArrayBuffer);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${slug}.pptx"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
