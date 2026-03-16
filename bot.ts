/**
 * Runway Telegram Bot
 * ─────────────────────────────────────────────
 * Self-hosted AI business team accessible via Telegram.
 * Powered by Ollama (free, local) with Claude as fallback.
 *
 * Setup:
 *   1. Create a bot via @BotFather on Telegram → get token
 *   2. Add TELEGRAM_BOT_TOKEN=... to .env.local
 *   3. Run: npm run bot
 */

import { config } from "dotenv";
// Load .env.local before anything else
config({ path: ".env.local" });
config({ path: ".env" });

import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import { Ollama } from "ollama";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { SOULS, routeToSoul, buildOrgContext, OrgContext, AgentSoul } from "./lib/bot/souls";

// ── Prisma (shared DB with the web app) ───────────────────────────
const dbPath = path.resolve(process.cwd(), "runway.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

// ── Ollama client ──────────────────────────────────────────────────
const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
const defaultModel = process.env.OLLAMA_MODEL || "llama3.2";
const ollama = new Ollama({ host: ollamaHost });

// ── In-memory conversation history (per chat) ─────────────────────
// { chatId: [{role, content}] }
const chatHistory = new Map<number, { role: "user" | "assistant"; content: string }[]>();
const MAX_HISTORY = 20; // messages to keep (10 exchanges)

// ── Org context cache ─────────────────────────────────────────────
let orgContext: OrgContext | null = null;

async function getOrgContext(): Promise<OrgContext> {
  if (orgContext) return orgContext;
  try {
    const profile = await prisma.orgProfile.findFirst();
    orgContext = buildOrgContext(profile);
  } catch {
    orgContext = buildOrgContext(null);
  }
  return orgContext;
}

// ── LLM call ──────────────────────────────────────────────────────
async function callAgent(
  soul: AgentSoul,
  history: { role: "user" | "assistant"; content: string }[],
  org: OrgContext
): Promise<string> {
  const systemPrompt = soul.systemPrompt(org);
  const model = process.env[`AGENT_MODEL_${soul.key.toUpperCase()}`] || defaultModel;

  // Try Ollama first
  try {
    const response = await ollama.chat({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
      ],
    });
    return response.message.content;
  } catch (ollamaErr) {
    // Fall back to Anthropic if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const lastMessage = history[history.length - 1];
        const resp = await client.messages.create({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
          max_tokens: 2048,
          system: systemPrompt,
          messages: history,
        });
        const block = resp.content[0];
        if (block.type === "text") return block.text;
      } catch {
        // both failed
      }
    }
    const err = ollamaErr as Error;
    if (err.message?.includes("ECONNREFUSED") || err.message?.includes("fetch")) {
      return `⚠️ Can't reach Ollama at ${ollamaHost}. Make sure it's running:\n\`\`\`\nollama serve\n\`\`\``;
    }
    throw ollamaErr;
  }
}

// ── Keep typing indicator alive ───────────────────────────────────
async function withTyping(ctx: Context & { chat: { id: number } }, fn: () => Promise<string>): Promise<string> {
  let done = false;
  const keepTyping = async () => {
    while (!done) {
      try { await ctx.sendChatAction("typing"); } catch { /* ignore */ }
      await new Promise((r) => setTimeout(r, 4000));
    }
  };
  keepTyping();
  try {
    return await fn();
  } finally {
    done = true;
  }
}

// ── Telegram safe send (splits long messages) ─────────────────────
async function safeSend(ctx: Context, text: string) {
  const MAX = 4096;
  if (text.length <= MAX) {
    await ctx.reply(text, { parse_mode: "Markdown" }).catch(() => ctx.reply(text));
    return;
  }
  // Split at paragraph boundaries
  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (current.length + line.length + 1 > MAX) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  for (const chunk of chunks) {
    await ctx.reply(chunk, { parse_mode: "Markdown" }).catch(() => ctx.reply(chunk));
  }
}

// ── Bot setup ─────────────────────────────────────────────────────
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN is not set in .env.local");
  console.error("   Create a bot via @BotFather on Telegram, then add:");
  console.error("   TELEGRAM_BOT_TOKEN=your_token_here");
  process.exit(1);
}

const bot = new Telegraf(token);

// /start
bot.start(async (ctx) => {
  const org = await getOrgContext();
  await ctx.reply(
    `*Welcome to Runway* 🚀\n\nYour AI business team is online.\n\n` +
    `*Your agents:*\n` +
    Object.values(SOULS).map((s) => `${s.emoji} *${s.name}* — ${s.role}`).join("\n") +
    `\n\n*How to use:*\n` +
    `• Just talk naturally — I'll route to the right agent\n` +
    `• Address agents by name: _"Vesper, find me grants"_\n` +
    `• Use /commands for quick actions\n\n` +
    `Currently powered by: \`${defaultModel}\` via Ollama\n` +
    `Org: ${org.orgName}`,
    { parse_mode: "Markdown" }
  );
});

// /help
bot.help(async (ctx) => {
  await ctx.reply(
    `*Runway Commands*\n\n` +
    `/agents — Show your AI team roster\n` +
    `/grants — Run a grant scan (Vesper)\n` +
    `/brief — Morning intelligence brief (Mira)\n` +
    `/tasks — View open tasks\n` +
    `/status — Check Ollama connection\n` +
    `/clear — Clear conversation history\n` +
    `/dashboard — Web dashboard info\n\n` +
    `*Or just talk:*\n` +
    `_"Soleil, write a LinkedIn post about our new program"_\n` +
    `_"Dex, what's our burn rate looking like?"_\n` +
    `_"Nadia, what should I focus on today?"_`,
    { parse_mode: "Markdown" }
  );
});

// /agents
bot.command("agents", async (ctx) => {
  const lines = Object.values(SOULS).map(
    (s) => `${s.emoji} *${s.name}* (${s.role})\n   _Trigger: ${s.aliases.slice(0, 3).join(", ")}_`
  );
  await ctx.reply(`*Your AI Team*\n\n${lines.join("\n\n")}`, { parse_mode: "Markdown" });
});

// /grants
bot.command("grants", async (ctx) => {
  const org = await getOrgContext();
  const chatId = ctx.chat.id;

  const response = await withTyping(ctx as Context & { chat: { id: number } }, async () => {
    const prompt = `Run a full grant scan for ${org.orgName}. Mission: ${org.mission}. Focus: ${org.focusAreas}. Location: ${org.location}. Find 6-8 active opportunities across Federal, private foundations, and CSR. Output as a clean markdown list with Name, Funder, Amount, Deadline, Alignment Score, and Action Required.`;
    const history = [{ role: "user" as const, content: prompt }];
    return await callAgent(SOULS.vesper, history, org);
  });

  // Save as document to DB
  try {
    const user = await prisma.user.findFirst();
    if (user) {
      await (prisma as any).document.create({
        data: {
          userId: user.id,
          type: "grant_pipeline",
          title: `Grant Scan — ${new Date().toLocaleDateString()}`,
          content: response,
        },
      });
    }
  } catch { /* non-critical */ }

  await safeSend(ctx, `${SOULS.vesper.emoji} *Vesper — Grant Scan*\n\n${response}`);
});

// /brief
bot.command("brief", async (ctx) => {
  const org = await getOrgContext();

  const response = await withTyping(ctx as Context & { chat: { id: number } }, async () => {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const prompt = `Generate the morning intelligence brief for ${today}. Cover: global news relevant to ${org.focusAreas}, tech/AI developments, market trends, opportunities and threats, and any flags for the owner.`;
    const history = [{ role: "user" as const, content: prompt }];
    return await callAgent(SOULS.mira, history, org);
  });

  // Save brief
  try {
    const user = await prisma.user.findFirst();
    if (user) {
      await (prisma as any).document.create({
        data: {
          userId: user.id,
          type: "morning_brief",
          title: `Morning Brief — ${new Date().toLocaleDateString()}`,
          content: response,
        },
      });
    }
  } catch { /* non-critical */ }

  await safeSend(ctx, `${SOULS.mira.emoji} *Mira — Morning Brief*\n\n${response}`);
});

// /tasks
bot.command("tasks", async (ctx) => {
  try {
    const tasks = await (prisma as any).task.findMany({
      where: { status: { in: ["todo", "in_progress"] } },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    if (tasks.length === 0) {
      await ctx.reply("✅ No open tasks. Clean slate!");
      return;
    }

    const lines = tasks.map((t: { title: string; status: string; category: string; scheduledFor: string }) => {
      const statusEmoji = t.status === "in_progress" ? "🔄" : "⬜";
      return `${statusEmoji} *${t.title}*\n   ${t.category} — ${t.scheduledFor}`;
    });

    await ctx.reply(`*Open Tasks (${tasks.length})*\n\n${lines.join("\n\n")}`, { parse_mode: "Markdown" });
  } catch {
    await ctx.reply("Couldn't load tasks. Make sure the web app has been set up.");
  }
});

// /status
bot.command("status", async (ctx) => {
  let ollamaStatus = "❌ Not reachable";
  let models: string[] = [];
  try {
    const list = await ollama.list();
    models = list.models.map((m) => m.name);
    ollamaStatus = `✅ Online (${models.length} model${models.length !== 1 ? "s" : ""})`;
  } catch { /* offline */ }

  let dbStatus = "❌ Error";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "✅ Connected";
  } catch { /* error */ }

  const modelList = models.length > 0 ? `\n\n*Available models:*\n${models.map((m) => `• \`${m}\``).join("\n")}` : "";

  await ctx.reply(
    `*System Status*\n\n` +
    `Ollama: ${ollamaStatus}\n` +
    `Database: ${dbStatus}\n` +
    `Active model: \`${defaultModel}\`\n` +
    `Ollama host: \`${ollamaHost}\`` +
    modelList,
    { parse_mode: "Markdown" }
  );
});

// /clear
bot.command("clear", async (ctx) => {
  chatHistory.delete(ctx.chat.id);
  await ctx.reply("🧹 Conversation history cleared.");
});

// /dashboard
bot.command("dashboard", async (ctx) => {
  await ctx.reply(
    `*Runway Dashboard*\n\n` +
    `Open your web browser and go to:\n` +
    `\`http://localhost:3000\`\n\n` +
    `Start both the web app and bot with:\n` +
    `\`npm run start:all\``,
    { parse_mode: "Markdown" }
  );
});

// Main message handler
bot.on(message("text"), async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;

  // Skip commands
  if (text.startsWith("/")) return;

  const org = await getOrgContext();
  const soul = routeToSoul(text);

  // Manage history
  const history = chatHistory.get(chatId) || [];
  history.push({ role: "user", content: text });

  const response = await withTyping(ctx as Context & { chat: { id: number } }, async () => {
    return await callAgent(soul, history, org);
  });

  history.push({ role: "assistant", content: response });
  // Trim to max length
  while (history.length > MAX_HISTORY) history.splice(0, 2);
  chatHistory.set(chatId, history);

  const header = `${soul.emoji} *${soul.name}* (${soul.role})`;
  await safeSend(ctx, `${header}\n\n${response}`);
});

// Error handler
bot.catch((err, ctx) => {
  console.error(`[Bot] Error for ${ctx.updateType}:`, err);
  ctx.reply("Something went wrong. Check the console for details.").catch(() => {});
});

// Launch
console.log("🚀 Runway bot starting...");
console.log(`   Ollama: ${ollamaHost} (model: ${defaultModel})`);
console.log(`   DB: ${dbPath}`);

bot.launch({
  allowedUpdates: ["message", "callback_query"],
}).then(() => {
  console.log("✅ Runway bot is running. Open Telegram and start chatting.");
}).catch((err) => {
  console.error("❌ Bot failed to start:", err.message);
  process.exit(1);
});

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
