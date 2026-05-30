export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getProvider, getOllamaModel, getAnthropicModel } from "@/lib/llm";
import { Ollama } from "ollama";

export async function GET() {
  const provider = getProvider();

  if (provider === "ollama") {
    try {
      const ollama = new Ollama({
        host: process.env.OLLAMA_HOST || "http://localhost:11434",
      });
      const list = await ollama.list();
      const models = list.models.map((m) => m.name);
      return NextResponse.json({
        provider: "ollama",
        model: getOllamaModel(),
        status: "online",
        availableModels: models,
      });
    } catch {
      return NextResponse.json({
        provider: "ollama",
        model: getOllamaModel(),
        status: "offline",
        availableModels: [],
      });
    }
  }

  return NextResponse.json({
    provider: "anthropic",
    model: getAnthropicModel(),
    status: "online",
    availableModels: [getAnthropicModel()],
  });
}
