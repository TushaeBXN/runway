export async function register() {
  // Only run in Node.js server runtime (not edge, not client)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initScheduler } = await import("@/lib/scheduler");
    initScheduler();
  }
}
