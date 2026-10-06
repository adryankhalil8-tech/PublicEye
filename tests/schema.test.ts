import { describe, expect, it } from "vitest";
import {
  caseClaimSchema,
  dateSpecSchema,
  idSchema,
  partialDateSchema,
  SCHEMA_VERSION,
} from "../src/domain";
import { parseWorkspace } from "../src/validation";
import { codes, rawFixture } from "./helpers";

describe("schema versions", () => {
  it("rejects an artifact from another schema version with a dedicated code", () => {
    const raw = rawFixture();
    (raw.claims as { schemaVersion: number }).schemaVersion =
      SCHEMA_VERSION + 1;
    const result = parseWorkspace(raw);
    expect(result.ok).toBe(false);
    expect(codes(result.issues)).toContain("SCHEMA_VERSION");
  });

  it("rejects an artifact with no schemaVersion", () => {
    const raw = rawFixture();
    delete (raw.timeline as { schemaVersion?: number }).schemaVersion;
    expect(codes(parseWorkspace(raw).issues)).toContain("SCHEMA_VERSION");
  });

  it("requires the research artifacts but not downstream ones", () => {
    const raw = rawFixture();
    delete raw.sources;
    delete raw.script;
    const result = parseWorkspace(raw);
    const missing = result.issues
      .filter((i) => i.code === "MISSING_ARTIFACT")
      .map((i) => i.path);
    expect(missing).toEqual(["sources.json"]);
  });

  it("reports schema errors with a JSON path", () => {
    const raw = rawFixture();
    (raw.claims as { claims: { status: string }[] }).claims[0].status =
      "PROBABLY_TRUE";
    const issue = parseWorkspace(raw).issues.find(
      (i) => i.code === "SCHEMA_INVALID",
    );
    expect(issue?.path).toBe("claims.json#/claims/0/status");
  });
});

describe("ids", () => {
  it("enforces per-kind prefixes", () => {
    expect(idSchema("claim").safeParse("clm-arrest").success).toBe(true);
    expect(idSchema("claim").safeParse("src-arrest").success).toBe(false);
    expect(idSchema("claim").safeParse("clm-Arrest").success).toBe(false);
  });
});

describe("dates", () => {
  it("accepts only YYYY, YYYY-MM, YYYY-MM-DD", () => {
    for (const ok of ["1931", "1931-10", "1931-10-17"])
      expect(partialDateSchema.safeParse(ok).success).toBe(true);
    for (const bad of ["31", "1931-13", "1931-10-32", "Oct 1931", "1931-1-1"]) {
      expect(partialDateSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it("supports exact, approximate, range and unknown precision", () => {
    expect(
      dateSpecSchema.safeParse({
        precision: "EXACT",
        date: "1954-11-12",
        time: "07:10",
      }).success,
    ).toBe(true);
    expect(
      dateSpecSchema.safeParse({
        precision: "APPROXIMATE",
        date: "1954",
        qualifier: "LATE",
      }).success,
    ).toBe(true);
    expect(
      dateSpecSchema.safeParse({
        precision: "RANGE",
        start: "1954-11",
        end: "1955",
      }).success,
    ).toBe(true);
    expect(dateSpecSchema.safeParse({ precision: "UNKNOWN" }).success).toBe(
      true,
    );
    expect(
      dateSpecSchema.safeParse({
        precision: "EXACT",
        date: "1954-11-12",
        time: "7pm",
      }).success,
    ).toBe(false);
  });
});

describe("claims", () => {
  it("requires attribution details on ATTRIBUTED claims", () => {
    const base = {
      id: "clm-x",
      text: "Police alleged X.",
      category: "INVESTIGATION",
      importance: "CORE",
      status: "UNVERIFIED",
      confidence: "LOW",
      sourceIds: [],
      evidence: [],
    };
    expect(
      caseClaimSchema.safeParse({
        ...base,
        assertion: { type: "ATTRIBUTED", verb: "ALLEGED" },
      }).success,
    ).toBe(false);
    expect(
      caseClaimSchema.safeParse({
        ...base,
        assertion: {
          type: "ATTRIBUTED",
          attributedTo: "police",
          verb: "ALLEGED",
        },
      }).success,
    ).toBe(true);
  });
});
