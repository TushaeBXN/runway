export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: channelId } = await params;
  const sinceParam = req.nextUrl.searchParams.get("since");
  let since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60_000);
  const userId = (session.user as { id?: string }).id ?? "unknown";

  console.log(`[SSE] open  channel=${channelId} user=${userId} since=${since.toISOString()}`);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      function send(payload: string) {
        if (closed) return;
        try { controller.enqueue(encoder.encode(payload)); } catch { /* stream gone */ }
      }

      function close(reason = "disconnect") {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        console.log(`[SSE] close channel=${channelId} user=${userId} reason=${reason}`);
        try { controller.close(); } catch { /* already closed */ }
      }

      async function poll() {
        if (closed) return;
        try {
          const messages = await prisma.channelMessage.findMany({
            where: { channelId, createdAt: { gt: since } },
            orderBy: { createdAt: "asc" },
          });

          if (closed) return; // client disconnected while we were querying

          if (messages.length > 0) {
            since = messages[messages.length - 1].createdAt;
            // Include last message id so client can reconnect with a precise cursor
            const lastId = messages[messages.length - 1].id;
            send(`id: ${lastId}\ndata: ${JSON.stringify(messages)}\n\n`);
          } else {
            send(": ping\n\n");
          }
        } catch (err) {
          console.error(`[SSE] poll error channel=${channelId}:`, err);
          close("db-error");
        }
      }

      // Immediate heartbeat so client knows the connection is live
      send(": ping\n\n");

      const interval = setInterval(poll, 2000);

      req.signal.addEventListener("abort", () => close("client-abort"));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
