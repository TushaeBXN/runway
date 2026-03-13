// Server-side singleton — safe to call multiple times
let initialized = false;

export function initSchedulerOnce(): void {
  if (typeof window !== "undefined") return; // client-side guard
  if (initialized) return;
  initialized = true;

  // Dynamic import to avoid bundling node-cron on the client
  import("@/lib/scheduler").then(({ initScheduler }) => {
    initScheduler();
  });
}
