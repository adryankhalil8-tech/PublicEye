import { describe, expect, it } from "vitest";
import { validateRawWorkspace } from "../src/validation";
import { codes, fixture, rawFixture } from "./helpers";

describe("synthetic fixture", () => {
  const report = validateRawWorkspace(rawFixture());

  it("parses every artifact through the full pipeline contracts", () => {
    expect(report.workspace).not.toBeNull();
    const ws = report.workspace!;
    for (const key of [
      "project",
      "sources",
      "claims",
      "entities",
      "timeline",
      "research",
      "story",
      "script",
      "narration",
      "alignment",
      "visualBible",
      "visualPlan",
      "assets",
      "manifest",
      "qaReport",
      "youtubePackage",
    ] as const) {
      expect(ws[key], key).toBeDefined();
    }
  });

  it("validates with zero errors", () => {
    expect(report.issues.filter((i) => i.severity === "ERROR")).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("produces only the expected, intentional warnings", () => {
    expect(codes(report.issues, "WARNING").sort()).toEqual([
      "ASSET_RIGHTS_UNKNOWN",
      "TARGET_DURATION_OUTSIDE_RANGE",
    ]);
  });

  it("is explicitly marked synthetic everywhere it matters", () => {
    const ws = fixture();
    expect(ws.project.isSynthetic).toBe(true);
    expect(ws.project.title).toMatch(/SYNTHETIC/);
    expect(ws.manifest?.isSynthetic).toBe(true);
    for (const s of ws.sources.sources)
      expect(new URL(s.url).hostname).toMatch(/\.invalid$/);
  });

  it("exercises every claim status and every date precision", () => {
    const ws = fixture();
    expect(new Set(ws.claims.claims.map((c) => c.status))).toEqual(
      new Set([
        "SUPPORTED",
        "DISPUTED",
        "CONTRADICTED",
        "INSUFFICIENT_EVIDENCE",
        "UNVERIFIED",
      ]),
    );
    expect(new Set(ws.timeline.events.map((e) => e.when.precision))).toEqual(
      new Set(["EXACT", "APPROXIMATE", "RANGE", "UNKNOWN"]),
    );
  });

  it("keeps the unverified motive rumor out of the script", () => {
    const ws = fixture();
    const cited = new Set(ws.script!.units.flatMap((u) => u.claimIds));
    expect(cited.has("clm-rumored-debts")).toBe(false);
  });

  it("surfaces uncertain dates as INFO rather than hiding them", () => {
    expect(
      report.issues.filter((i) => i.code === "UNCERTAIN_DATE"),
    ).toHaveLength(3);
  });
});
