import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const AGENT_IDS = [
  "ceoAgent",
  "marketingAgent",
  "devAgent",
  "inboxAgent",
  "grantArchitectAgent",
];

export async function GET() {
  const runs = await Promise.all(
    AGENT_IDS.map((agentId) =>
      prisma.agentRun.findFirst({
        where: { agentId },
        orderBy: { ranAt: "desc" },
      })
    )
  );

  return NextResponse.json(
    runs.map((run, i) =>
      run ?? {
        agentId: AGENT_IDS[i],
        agentName: AGENT_IDS[i],
        status: "never_run",
        output: "",
        ranAt: null,
      }
    )
  );
}
