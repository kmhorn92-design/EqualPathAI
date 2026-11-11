/**
 * Coach booking engine — pure functions (no DB) so they can be unit-tested.
 * Availability is stored as weekly windows in the COACH's IANA time zone; slots are
 * produced as UTC instants and rendered in the CLIENT's time zone by the browser.
 */

export const SESSION_TYPES = {
  intro: { name: "Intro call", minutes: 15, free: true, blurb: "Free 15-minute get-to-know-you call" },
  strategy: { name: "Job search strategy", minutes: 45, free: false, blurb: "A plan for your remote, hybrid or on-site search" },
  resume: { name: "Resume review", minutes: 45, free: false, blurb: "Walk through a resume version you choose to share" },
  interview: { name: "Mock interview", minutes: 60, free: false, blurb: "Practice with live feedback" },
} as const;
export type SessionType = keyof typeof SESSION_TYPES;
export const FORMATS = ["video", "phone", "in-person"] as const;
export type Format = (typeof FORMATS)[number];

export const SLOT_STEP_MIN = 30;
export const MIN_LEAD_HOURS = 12;
export const HORIZON_DAYS = 21;
export const CLIENT_CANCEL_CUTOFF_HOURS = 2;

export type Window = { weekday: number; startMinute: number; endMinute: number };
export type Busy = { startsAt: Date; endsAt: Date };

export function isValidTimeZone(tz: string) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

/** Wall-clock parts of an instant in a time zone. */
export function zonedParts(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour % 24, minute: +p.minute, second: +p.second, weekday: wd };
}

function offsetMs(date: Date, tz: string) {
  const z = zonedParts(date, tz);
  return Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second) - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converts a wall-clock time in `tz` to the UTC instant (handles DST). */
export function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, tz: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMs(new Date(guess), tz);
  const second = guess - offsetMs(new Date(first), tz);
  return new Date(second);
}

/** Validates & normalizes weekly windows: in range, on the slot grid, non-overlapping per day. */
export function normalizeWindows(ws: Window[]): Window[] {
  const out: Window[] = [];
  for (let d = 0; d < 7; d++) {
    const day = ws.filter((w) => w.weekday === d)
      .map((w) => ({ weekday: d, startMinute: Math.max(0, Math.round(w.startMinute / SLOT_STEP_MIN) * SLOT_STEP_MIN), endMinute: Math.min(1440, Math.round(w.endMinute / SLOT_STEP_MIN) * SLOT_STEP_MIN) }))
      .filter((w) => w.endMinute > w.startMinute).sort((a, b) => a.startMinute - b.startMinute);
    for (const w of day) {
      const last = out[out.length - 1];
      if (last && last.weekday === d && w.startMinute <= last.endMinute) last.endMinute = Math.max(last.endMinute, w.endMinute);
      else out.push({ ...w });
    }
  }
  return out;
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

/**
 * Bookable start times for a session length, from `now + lead` to `now + horizon`.
 * A slot is offered only if the whole session fits inside one availability window and
 * doesn't overlap an active booking.
 */
export function generateSlots(opts: { windows: Window[]; tz: string; busy: Busy[]; minutes: number; now?: Date; days?: number; leadHours?: number }): Date[] {
  const now = opts.now ?? new Date();
  const earliest = now.getTime() + (opts.leadHours ?? MIN_LEAD_HOURS) * 36e5;
  const latest = now.getTime() + (opts.days ?? HORIZON_DAYS) * 864e5;
  const busy = opts.busy.map((b) => [b.startsAt.getTime(), b.endsAt.getTime()] as const);
  const out: Date[] = [];
  const startLocal = zonedParts(now, opts.tz);
  for (let i = 0; i <= (opts.days ?? HORIZON_DAYS) + 1; i++) {
    // Walk calendar days in the coach's zone (noon avoids DST edge ambiguity).
    const noon = zonedToUtc(startLocal.year, startLocal.month, startLocal.day + i, 12, 0, opts.tz);
    const d = zonedParts(noon, opts.tz);
    for (const w of opts.windows.filter((x) => x.weekday === d.weekday)) {
      for (let m = w.startMinute; m + opts.minutes <= w.endMinute; m += SLOT_STEP_MIN) {
        const s = zonedToUtc(d.year, d.month, d.day, Math.floor(m / 60), m % 60, opts.tz);
        const t0 = s.getTime(), t1 = t0 + opts.minutes * 6e4;
        if (t0 < earliest || t0 > latest) continue;
        if (busy.some(([b0, b1]) => overlaps(t0, t1, b0, b1))) continue;
        out.push(s);
      }
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

/** True if `start` is one of the slots generateSlots would offer (server-side re-validation). */
export function isBookable(start: Date, opts: Parameters<typeof generateSlots>[0]) {
  return generateSlots(opts).some((s) => s.getTime() === start.getTime());
}

/** Minimal RFC 5545 calendar file for a confirmed session. */
export function toIcs(b: { id: string; title: string; description: string; startsAt: Date; endsAt: Date; location?: string | null; url?: string | null }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EqualPath AI//Coaching//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${b.id}@equalpath.ai`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(b.startsAt)}`, `DTEND:${fmt(b.endsAt)}`,
    `SUMMARY:${esc(b.title)}`, `DESCRIPTION:${esc(b.description)}`, ...(b.location ? [`LOCATION:${esc(b.location)}`] : []), ...(b.url ? [`URL:${b.url}`] : []),
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}
