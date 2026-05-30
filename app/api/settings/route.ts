export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, mask } from "@/lib/crypto";

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
  const settings = s ? {
    llmProvider: s.llmProvider,
    anthropicKeyLast4: s.anthropicKey ? mask(decrypt(s.anthropicKey), 4).slice(-4) : null,
    openaiKeyLast4: s.openaiKey ? mask(decrypt(s.openaiKey), 4).slice(-4) : null,
    geminiKeyLast4: s.geminiKey ? mask(decrypt(s.geminiKey), 4).slice(-4) : null,
    ollamaHost: s.ollamaHost,
    ollamaModel: s.ollamaModel,
    scheduleConfig: s.scheduleConfig ? JSON.parse(s.scheduleConfig) : null,
    useLocalForSimple: s.useLocalForSimple,
    useCloudForComplex: s.useCloudForComplex,
  } : null;

  return NextResponse.json({ orgProfile: user.orgProfile, subscription: user.subscription, aiSettings: settings });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { llmProvider, anthropicKey, openaiKey, geminiKey, ollamaHost, ollamaModel, scheduleConfig, useLocalForSimple, useCloudForComplex } = await req.json();

  const data: Record<string, string> = {
    llmProvider: llmProvider || "ollama",
    ollamaHost: ollamaHost || "http://localhost:11434",
    ollamaModel: ollamaModel || "llama3.2:3b",
  };

  // Encrypt all API keys before storing
  if (anthropicKey?.trim()) data.anthropicKey = encrypt(anthropicKey.trim());
  if (openaiKey?.trim()) data.openaiKey = encrypt(openaiKey.trim());
  if (geminiKey?.trim()) data.geminiKey = encrypt(geminiKey.trim());
  if (scheduleConfig) data.scheduleConfig = JSON.stringify(scheduleConfig);
  if (typeof useLocalForSimple === "boolean") (data as Record<string, unknown>).useLocalForSimple = useLocalForSimple;
  if (typeof useCloudForComplex === "boolean") (data as Record<string, unknown>).useCloudForComplex = useCloudForComplex;

  await prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  await prisma.auditLog.create({
    data: { userId, action: "SETTINGS_UPDATED", resource: "UserSettings", detail: `LLM provider set to ${llmProvider}` },
  });

  return NextResponse.json({ ok: true });
}
