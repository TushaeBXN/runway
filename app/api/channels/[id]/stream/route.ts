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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send a heartbeat immediately so the client knows it's connected
      controller.enqueue(encoder.encode(": ping\n\n"));

      const poll = async () => {
        try {
          const messages = await prisma.channelMessage.findMany({
            where: { channelId, createdAt: { gt: since } },
            orderBy: { createdAt: "asc" },
          });

          if (messages.length > 0) {
            since = messages[messages.length - 1].createdAt;
            const data = JSON.stringify(messages);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } else {
            // Keep-alive heartbeat every poll cycle
            controller.enqueue(encoder.encode(": ping\n\n"));
          }
        } catch {
          controller.close();
        }
      };

      // Poll every 2s on the server side — one persistent connection beats
      // a new HTTP request every 4s from the client
      const interval = setInterval(poll, 2000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
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
