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

  // Mask API key — only return last 4 chars
  const settings = user.settings
    ? {
        llmProvider: user.settings.llmProvider,
        anthropicKeyLast4: user.settings.anthropicKey
          ? user.settings.anthropicKey.slice(-4)
          : null,
        ollamaHost: user.settings.ollamaHost,
        ollamaModel: user.settings.ollamaModel,
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
  const { llmProvider, anthropicKey, ollamaHost, ollamaModel } = await req.json();

  const data: {
    llmProvider: string;
    ollamaHost: string;
    ollamaModel: string;
    anthropicKey?: string;
  } = {
    llmProvider: llmProvider || "anthropic",
    ollamaHost: ollamaHost || "http://localhost:11434",
    ollamaModel: ollamaModel || "llama3.2",
  };

  // Only update anthropicKey if a new one was provided (non-empty)
  if (anthropicKey && anthropicKey.trim() !== "") {
    data.anthropicKey = anthropicKey.trim();
  }

  await prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  return NextResponse.json({ ok: true });
}
