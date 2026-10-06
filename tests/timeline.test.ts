import { describe, expect, it } from "vitest";
import {
  dateSpecBounds,
  formatDateSpec,
  partialDateBounds,
} from "../src/domain";
import { errorCodes, find, issuesAfter } from "./helpers";

describe("date bounds", () => {
  it("expands partial dates without inventing precision", () => {
    expect(partialDateBounds("1954")).toEqual({
      min: "1954-01-01",
      max: "1954-12-31",
    });
    expect(partialDateBounds("1956-02")).toEqual({
      min: "1956-02-01",
      max: "1956-02-29",
    });
    expect(partialDateBounds("1954-11-12")).toEqual({
      min: "1954-11-12",
      max: "1954-11-12",
    });
  });

  it("widens approximate dates and returns null for unknown", () => {
    expect(
      dateSpecBounds({
        precision: "APPROXIMATE",
        date: "1954",
        qualifier: "CIRCA",
      }),
    ).toEqual({ min: "1953-01-01", max: "1955-12-31" });
    expect(dateSpecBounds({ precision: "UNKNOWN" })).toBeNull();
  });

  it("formats labels that keep uncertainty visible", () => {
    expect(
      formatDateSpec({
        precision: "APPROXIMATE",
        date: "1952",
        qualifier: "CIRCA",
      }),
    ).toBe("c. 1952");
    expect(
      formatDateSpec({
        precision: "RANGE",
        start: "1954-11-11",
        end: "1954-11-12",
      }),
    ).toBe("November 11–12, 1954");
    expect(
      formatDateSpec({ precision: "RANGE", start: "1951", end: "1953" }),
    ).toBe("1951 – 1953");
    expect(formatDateSpec({ precision: "EXACT", date: "1954-12" })).toBe(
      "December 1954",
    );
    expect(formatDateSpec({ precision: "UNKNOWN" })).toBe("Date unknown");
  });
});

describe("timeline validation", () => {
  it("errors when events are definitely out of order", () => {
    const issues = issuesAfter((ws) => {
      const [a, b] = [ws.timeline.events[0], ws.timeline.events.at(-1)!];
      ws.timeline.events[0] = b;
      ws.timeline.events[ws.timeline.events.length - 1] = a;
    });
    expect(errorCodes(issues)).toContain("TIMELINE_ORDER");
  });

  it("allows overlapping uncertain dates in either order", () => {
    // "Late 1954" (approximate) sits after "December 1954" in the fixture.
    const issues = issuesAfter(() => {});
    expect(errorCodes(issues)).not.toContain("TIMELINE_ORDER");
  });

  it("enforces relative order for unknown dates", () => {
    const issues = issuesAfter((ws) => {
      const e = find(ws.timeline.events, "evt-tallis-suspected");
      if (e.when.precision === "UNKNOWN") e.when.afterEventId = "evt-acquittal";
    });
    expect(errorCodes(issues)).toContain("TIMELINE_ORDER");
  });

  it("rejects inverted ranges", () => {
    const issues = issuesAfter((ws) => {
      find(ws.timeline.events, "evt-payroll-taken").when = {
        precision: "RANGE",
        start: "1954-11-12",
        end: "1954-11-11",
      };
    });
    expect(errorCodes(issues)).toContain("INVALID_DATE_RANGE");
  });

  it("does not let an event be CONFIRMED on unsupported claims", () => {
    const issues = issuesAfter((ws) => {
      find(ws.timeline.events, "evt-light-seen").certainty = "CONFIRMED";
    });
    expect(errorCodes(issues)).toContain("EVENT_CERTAINTY_OVERSTATED");
  });

  it("warns when a day-precise date lacks primary support", () => {
    const issues = issuesAfter((ws) => {
      find(ws.timeline.events, "evt-still-missing").when = {
        precision: "EXACT",
        date: "1955-04-02",
      };
    });
    expect(issues.map((i) => i.code)).toContain(
      "DATE_PRECISION_UNCORROBORATED",
    );
  });

  it("requires every event to rest on a known claim", () => {
    const issues = issuesAfter((ws) => {
      ws.timeline.events[0].claimIds = ["clm-invented"];
    });
    expect(errorCodes(issues)).toContain("BROKEN_CLAIM_REF");
  });
});
