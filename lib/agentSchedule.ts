/**
 * Agent schedule configuration.
 *
 * Default schedule (all times Eastern):
 *   Business loop:  4:30 AM  Mon–Fri  (CEO + secondary agents)
 *   Cool-down:      5:30 PM  Mon–Fri  (debrief, wrap up, log summary)
 *   Off-hours loop: 6:00 PM  daily    (Upwork scout + job executor)
 *   Weekend off-hours: same 6:00 PM trigger runs Sat/Sun too
 *
 * Business owners can override any of these in Settings.
 * The scheduler reads from DB if a user config exists; falls back to defaults.
 */

export interface ScheduleConfig {
  // Business hours window
  businessStartHour: number;   // 0-23, Eastern time
  businessStartMin: number;
  businessEndHour: number;     // end = cool-down start
  businessEndMin: number;
  businessDays: number[];      // 0=Sun,1=Mon...6=Sat. default [1,2,3,4,5]

  // Off-hours / Upwork window
  offHoursStartHour: number;
  offHoursStartMin: number;
  offHoursRunWeekends: boolean;

  // Cool-down (between business end and off-hours start)
  coolDownMinutes: number;     // default 30

  // Cost controls
  useLocalForSimpleTasks: boolean;   // default true — ollama for simple/medium
  useCloudForComplexTasks: boolean;  // default true — cloud for complex/research
  maxDailyApiCallsEstimate: number;  // informational, shown in UI
}

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  businessStartHour: 4,
  businessStartMin: 30,
  businessEndHour: 17,
  businessEndMin: 30,
  businessDays: [1, 2, 3, 4, 5],  // Mon–Fri

  offHoursStartHour: 18,
  offHoursStartMin: 0,
  offHoursRunWeekends: true,

  coolDownMinutes: 30,

  useLocalForSimpleTasks: true,
  useCloudForComplexTasks: true,
  maxDailyApiCallsEstimate: 20,
};

/** Convert a ScheduleConfig to node-cron expressions (Eastern time via UTC offset) */
export function toCronExpressions(cfg: ScheduleConfig): {
  business: string;
  coolDown: string;
  offHours: string;
} {
  // node-cron runs in server local time — we store ET offsets
  // ET is UTC-5 (EST) or UTC-4 (EDT). We use the hour as-is since
  // the server should be configured to run in ET, or we note the offset.
  const daysExpr = cfg.businessDays.join(",");
  const weekendOrDaily = cfg.offHoursRunWeekends ? "*" : daysExpr;

  return {
    business: `${cfg.businessStartMin} ${cfg.businessStartHour} * * ${daysExpr}`,
    coolDown: `${cfg.businessEndMin} ${cfg.businessEndHour} * * ${daysExpr}`,
    offHours: `${cfg.offHoursStartMin} ${cfg.offHoursStartHour} * * ${weekendOrDaily}`,
  };
}

/** Human-readable summary of the schedule for display in UI */
export function describeSchedule(cfg: ScheduleConfig): {
  business: string;
  offHours: string;
  savings: string;
} {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = cfg.businessDays.map(d => dayNames[d]).join(", ");
  const fmt = (h: number, m: number) => {
    const ampm = h < 12 ? "AM" : "PM";
    const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hr}:${m.toString().padStart(2, "0")} ${ampm} ET`;
  };

  return {
    business: `${fmt(cfg.businessStartHour, cfg.businessStartMin)} – ${fmt(cfg.businessEndHour, cfg.businessEndMin)} · ${days}`,
    offHours: `${fmt(cfg.offHoursStartHour, cfg.offHoursStartMin)} – ${fmt(cfg.businessStartHour, cfg.businessStartMin)} ET · ${cfg.offHoursRunWeekends ? "Every day" : days}`,
    savings: cfg.useLocalForSimpleTasks
      ? "Simple tasks → local model (free) · Complex tasks → cloud model"
      : "All tasks → cloud model",
  };
}

/** Decide which model config to use for a given complexity + schedule config */
export function shouldUseCloud(
  complexity: "simple" | "medium" | "complex" | "research",
  cfg: ScheduleConfig
): boolean {
  if (!cfg.useLocalForSimpleTasks) return true;
  if (!cfg.useCloudForComplexTasks) return false;
  return complexity === "complex" || complexity === "research";
}
