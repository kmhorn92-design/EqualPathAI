import { describe, it, expect } from "vitest";
import { zonedToUtc, zonedParts, generateSlots, normalizeWindows, isBookable, toIcs, isValidTimeZone } from "@/lib/booking";

describe("time zones", () => {
  it("converts wall time to UTC, including across DST", () => {
    // Chicago is UTC-6 in winter (CST) and UTC-5 in summer (CDT).
    expect(zonedToUtc(2026, 1, 15, 9, 0, "America/Chicago").toISOString()).toBe("2026-01-15T15:00:00.000Z");
    expect(zonedToUtc(2026, 7, 15, 9, 0, "America/Chicago").toISOString()).toBe("2026-07-15T14:00:00.000Z");
    expect(zonedToUtc(2026, 3, 8, 12, 0, "America/New_York").toISOString()).toBe("2026-03-08T16:00:00.000Z"); // DST start day
    expect(zonedToUtc(2026, 11, 20, 18, 30, "Asia/Kolkata").toISOString()).toBe("2026-11-20T13:00:00.000Z");
  });
  it("reports weekday in the zone, not UTC", () => {
    // 2026-11-12 03:00Z is still Wednesday evening in Chicago
    expect(zonedParts(new Date("2026-11-12T03:00:00Z"), "America/Chicago").weekday).toBe(3);
  });
  it("validates zone names", () => {
    expect(isValidTimeZone("America/Chicago")).toBe(true);
    expect(isValidTimeZone("Mars/Base")).toBe(false);
  });
});

describe("slot generation", () => {
  const now = new Date("2026-11-09T12:00:00Z"); // Monday 06:00 in Chicago
  const windows = [{ weekday: 2, startMinute: 9 * 60, endMinute: 11 * 60 }]; // Tuesdays 9–11 local

  it("offers slots inside the window, in the coach's zone, after the lead time", () => {
    const s = generateSlots({ windows, tz: "America/Chicago", busy: [], minutes: 45, now, days: 7 });
    expect(s.map((d) => d.toISOString())).toEqual(["2026-11-10T15:00:00.000Z", "2026-11-10T15:30:00.000Z", "2026-11-10T16:00:00.000Z"]);
  });
  it("only offers slots where the whole session fits", () => {
    const s = generateSlots({ windows, tz: "America/Chicago", busy: [], minutes: 60, now, days: 7 });
    expect(s).toHaveLength(3); // 9:00, 9:30, 10:00
    expect(generateSlots({ windows, tz: "America/Chicago", busy: [], minutes: 120, now, days: 7 })).toHaveLength(1);
  });
  it("removes slots that overlap existing bookings (no double-booking)", () => {
    const busy = [{ startsAt: new Date("2026-11-10T15:30:00Z"), endsAt: new Date("2026-11-10T16:15:00Z") }];
    const s = generateSlots({ windows, tz: "America/Chicago", busy, minutes: 30, now, days: 7 });
    expect(s.map((d) => d.toISOString())).toEqual(["2026-11-10T15:00:00.000Z", "2026-11-10T16:30:00.000Z"]);
  });
  it("respects minimum lead time", () => {
    const late = new Date("2026-11-10T08:00:00Z"); // Tue 02:00 Chicago → next slot must be ≥ 20:00Z
    expect(generateSlots({ windows, tz: "America/Chicago", busy: [], minutes: 30, now: late, days: 2 })).toHaveLength(0);
  });
  it("re-validates a requested start time", () => {
    const opts = { windows, tz: "America/Chicago", busy: [], minutes: 45, now, days: 7 };
    expect(isBookable(new Date("2026-11-10T15:30:00Z"), opts)).toBe(true);
    expect(isBookable(new Date("2026-11-10T15:10:00Z"), opts)).toBe(false);
    expect(isBookable(new Date("2026-11-10T22:00:00Z"), opts)).toBe(false);
  });
  it("normalizes windows: snaps to grid, merges overlaps, drops empty", () => {
    expect(normalizeWindows([
      { weekday: 1, startMinute: 540, endMinute: 600 }, { weekday: 1, startMinute: 590, endMinute: 700 },
      { weekday: 2, startMinute: 600, endMinute: 600 }, { weekday: 3, startMinute: 545, endMinute: 2000 },
    ])).toEqual([{ weekday: 1, startMinute: 540, endMinute: 690 }, { weekday: 3, startMinute: 540, endMinute: 1440 }]);
  });
});

describe("calendar file", () => {
  it("produces a valid VEVENT", () => {
    const ics = toIcs({ id: "b1", title: "Mock interview, EqualPath", description: "Line 1\nLine 2", startsAt: new Date("2026-11-10T15:00:00Z"), endsAt: new Date("2026-11-10T16:00:00Z"), url: "https://meet.example/x" });
    expect(ics).toContain("DTSTART:20261110T150000Z");
    expect(ics).toContain("SUMMARY:Mock interview\\, EqualPath");
    expect(ics).toContain("DESCRIPTION:Line 1\\nLine 2");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});

describe("site assistant (help-guide retrieval)", async () => {
  const { guideAnswer } = await import("@/lib/assistant");
  const { searchGuide, SITE_GUIDE } = await import("@/content/site-guide");
  it("routes common questions to the right page", () => {
    expect(guideAnswer("how do I upload my resume?").links[0].href).toBe("/resume");
    expect(guideAnswer("where can I find remote jobs").links[0].href).toBe("/jobs");
    expect(guideAnswer("can I talk to a recruiter at a company?").links[0].href).toBe("/partners");
    expect(guideAnswer("book a session with a coach").links[0].href).toBe("/coaches");
    expect(guideAnswer("do you train AI on my resume").links[0].href).toBe("/privacy");
  });
  it("never invents an ATS guarantee", () => {
    expect(guideAnswer("will my resume pass the ATS?").answer).toMatch(/No tool can honestly guarantee/);
  });
  it("admits when it doesn't know", () => {
    expect(searchGuide("what's the weather in Paris")).toHaveLength(0);
    expect(guideAnswer("what's the weather in Paris").answer).toMatch(/not sure/);
  });
  it("every guide entry has a unique id and a link", () => {
    expect(new Set(SITE_GUIDE.map((e) => e.id)).size).toBe(SITE_GUIDE.length);
    for (const e of SITE_GUIDE) expect(e.link?.href).toMatch(/^\//);
  });
});

describe("assistant links", async () => {
  const { guideAnswer } = await import("@/lib/assistant");
  it("never returns duplicate links", () => {
    for (const q of ["how do I find hybrid jobs?", "remote job board listings", "resume upload tailor"]) {
      const hrefs = guideAnswer(q).links.map((l) => l.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });
});
