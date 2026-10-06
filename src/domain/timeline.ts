import { z } from "zod";
import {
  idSchema,
  nonEmpty,
  partialDateSchema,
  schemaVersionSchema,
  type PartialDate,
} from "./common";

/**
 * When something happened, stated no more precisely than the sources allow.
 *
 * - EXACT: known to the granularity of `date` ("1931" is an exact year,
 *   "1931-10-17" an exact day). Optional local time.
 * - APPROXIMATE: "circa", "early", "late"… around `date`.
 * - RANGE: happened at some point between `start` and `end` (inclusive).
 * - UNKNOWN: no date; optionally ordered relative to other events.
 */
export const dateSpecSchema = z.discriminatedUnion("precision", [
  z.object({
    precision: z.literal("EXACT"),
    date: partialDateSchema,
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be HH:MM (24h)")
      .optional(),
    timezone: z.string().optional(),
  }),
  z.object({
    precision: z.literal("APPROXIMATE"),
    date: partialDateSchema,
    qualifier: z.enum(["CIRCA", "EARLY", "MID", "LATE", "BEFORE", "AFTER"]),
  }),
  z.object({
    precision: z.literal("RANGE"),
    start: partialDateSchema,
    end: partialDateSchema,
  }),
  z.object({
    precision: z.literal("UNKNOWN"),
    afterEventId: idSchema("event").optional(),
    beforeEventId: idSchema("event").optional(),
    note: z.string().optional(),
  }),
]);
export type DateSpec = z.infer<typeof dateSpecSchema>;

export const eventCertaintySchema = z.enum([
  "CONFIRMED",
  "PROBABLE",
  "DISPUTED",
  "UNCERTAIN",
]);
export type EventCertainty = z.infer<typeof eventCertaintySchema>;

export const caseEventSchema = z.object({
  id: idSchema("event"),
  when: dateSpecSchema,
  description: nonEmpty,
  personIds: z.array(idSchema("person")).default([]),
  locationIds: z.array(idSchema("location")).default([]),
  /** Every event must rest on at least one claim — no invented chronology. */
  claimIds: z.array(idSchema("claim")).min(1),
  sourceIds: z.array(idSchema("source")).default([]),
  certainty: eventCertaintySchema,
  notes: z.string().optional(),
});
export type CaseEvent = z.infer<typeof caseEventSchema>;

export const timelineGapSchema = z.object({
  id: idSchema("gap"),
  afterEventId: idSchema("event").optional(),
  beforeEventId: idSchema("event").optional(),
  description: nonEmpty,
});
export type TimelineGap = z.infer<typeof timelineGapSchema>;

/** `events` is stored in chronological order; validation enforces it. */
export const caseTimelineSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("timeline"),
  events: z.array(caseEventSchema),
  gaps: z.array(timelineGapSchema).default([]),
});
export type CaseTimeline = z.infer<typeof caseTimelineSchema>;

// ---------------------------------------------------------------------------
// Date arithmetic on partial dates (no invented precision: we compute bounds)
// ---------------------------------------------------------------------------

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Earliest and latest calendar day a partial date could refer to. */
export const partialDateBounds = (
  d: PartialDate,
): { min: string; max: string } => {
  const [y, m, day] = d.split("-");
  if (day) return { min: d, max: d };
  if (m) {
    const last = String(daysInMonth(Number(y), Number(m))).padStart(2, "0");
    return { min: `${y}-${m}-01`, max: `${y}-${m}-${last}` };
  }
  return { min: `${y}-01-01`, max: `${y}-12-31` };
};

/**
 * Bounds (YYYY-MM-DD, lexically comparable) of when an event could have
 * occurred, or null when the date is unknown. APPROXIMATE dates widen the
 * window by one unit of their own granularity on each open side.
 */
export const dateSpecBounds = (
  spec: DateSpec,
): { min: string; max: string } | null => {
  switch (spec.precision) {
    case "EXACT":
      return partialDateBounds(spec.date);
    case "RANGE":
      return {
        min: partialDateBounds(spec.start).min,
        max: partialDateBounds(spec.end).max,
      };
    case "APPROXIMATE": {
      const base = partialDateBounds(spec.date);
      const shift = (iso: string, dir: 1 | -1) => {
        const parts = spec.date.split("-").length;
        const dt = new Date(`${iso}T00:00:00Z`);
        if (parts === 1) dt.setUTCFullYear(dt.getUTCFullYear() + dir);
        else if (parts === 2) dt.setUTCMonth(dt.getUTCMonth() + dir);
        else dt.setUTCDate(dt.getUTCDate() + dir * 7);
        return dt.toISOString().slice(0, 10);
      };
      if (spec.qualifier === "BEFORE")
        return { min: "0000-01-01", max: base.max };
      if (spec.qualifier === "AFTER")
        return { min: base.min, max: "9999-12-31" };
      return { min: shift(base.min, -1), max: shift(base.max, 1) };
    }
    case "UNKNOWN":
      return null;
  }
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatPartial = (d: PartialDate) => {
  const [y, m, day] = d.split("-");
  if (!m) return y;
  const month = MONTHS[Number(m) - 1];
  return day ? `${month} ${Number(day)}, ${y}` : `${month} ${y}`;
};

/** Human label that preserves the uncertainty, e.g. "c. 1952", "1951–1953". */
export const formatDateSpec = (spec: DateSpec): string => {
  switch (spec.precision) {
    case "EXACT":
      return spec.time
        ? `${formatPartial(spec.date)}, ${spec.time}`
        : formatPartial(spec.date);
    case "APPROXIMATE": {
      const q = {
        CIRCA: "c.",
        EARLY: "Early",
        MID: "Mid-",
        LATE: "Late",
        BEFORE: "Before",
        AFTER: "After",
      }[spec.qualifier];
      return spec.qualifier === "MID"
        ? `${q}${formatPartial(spec.date)}`
        : `${q} ${formatPartial(spec.date)}`;
    }
    case "RANGE": {
      const [sy, sm, sd] = spec.start.split("-");
      const [ey, em, ed] = spec.end.split("-");
      // "November 11–12, 1954" when only the day differs.
      if (sy === ey && sm && sm === em && sd && ed)
        return `${MONTHS[Number(sm) - 1]} ${Number(sd)}–${Number(ed)}, ${sy}`;
      return `${formatPartial(spec.start)} – ${formatPartial(spec.end)}`;
    }
    case "UNKNOWN":
      return "Date unknown";
  }
};
