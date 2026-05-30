import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { orgProfile: true, subscription: true, settings: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const s = user.settings;
  const settings = s
    ? {
        llmProvider: s.llmProvider,
        anthropicKeyLast4: s.anthropicKey ? s.anthropicKey.slice(-4) : null,
        openaiKeyLast4: s.openaiKey ? s.openaiKey.slice(-4) : null,
        geminiKeyLast4: s.geminiKey ? s.geminiKey.slice(-4) : null,
        ollamaHost: s.ollamaHost,
        ollamaModel: s.ollamaModel,
      }
    : null;

  return NextResponse.json({
    orgProfile: user.orgProfile,
    subscription: user.subscription,
    aiSettings: settings,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { llmProvider, anthropicKey, openaiKey, geminiKey, ollamaHost, ollamaModel } =
    await req.json();

  const data: Record<string, string> = {
    llmProvider: llmProvider || "ollama",
    ollamaHost: ollamaHost || "http://localhost:11434",
    ollamaModel: ollamaModel || "llama3.2:3b",
  };

  if (anthropicKey?.trim()) data.anthropicKey = anthropicKey.trim();
  if (openaiKey?.trim()) data.openaiKey = openaiKey.trim();
  if (geminiKey?.trim()) data.geminiKey = geminiKey.trim();

  await prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  return NextResponse.json({ ok: true });
}
