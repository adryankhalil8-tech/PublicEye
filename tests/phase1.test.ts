import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  caseCandidateSchema,
  sourceSnapshotSchema,
  type CaseCandidate,
} from "../src/domain";
import { checkBudget, toCaseLawHit } from "../src/providers/courtlistener";
import { decideCandidate, validateCandidate } from "../src/research/candidates";
import {
  buildReviewPacket,
  excerptInText,
  type ExcerptCheck,
} from "../src/research/review-packet";
import { codes, fixture, issuesAfter } from "./helpers";

const NOW = 1_800_000_000_000;
const ago = (ms: number, n: number) =>
  Array.from({ length: n }, (_, i) => NOW - ms + i);

describe("CourtListener budget", () => {
  it("allows requests under every rolling limit", () => {
    const d = checkBudget([NOW - 120_000], NOW);
    expect(d.ok).toBe(true);
  });

  it("waits out the per-minute limit (keeping one request of headroom)", () => {
    const d = checkBudget(ago(30_000, 4), NOW);
    expect(d).toMatchObject({ ok: false, canWait: true });
    if (!d.ok) expect(d.waitMs).toBeGreaterThan(0);
  });

  it("stops (does not wait) at the hourly and daily limits", () => {
    const hourly = checkBudget(ago(1_800_000, 49), NOW);
    expect(hourly).toMatchObject({ ok: false, canWait: false });
    const spread = Array.from(
      { length: 124 },
      (_, i) => NOW - 80_000_000 + i * 600_000,
    );
    expect(checkBudget(spread, NOW)).toMatchObject({
      ok: false,
      canWait: false,
    });
  });

  it("ignores requests older than every window", () => {
    expect(checkBudget(ago(90_000_000, 200), NOW).ok).toBe(true);
  });
});

describe("CourtListener search hits", () => {
  it("map to compact, absolute-URL records", () => {
    const hit = toCaseLawHit({
      cluster_id: 1479640,
      caseName: "Capone v. United States",
      court: "Court of Appeals for the Seventh Circuit",
      dateFiled: "1932-02-27",
      citation: ["56 F.2d 927"],
      absolute_url: "/opinion/1479640/capone-v-united-states/",
      opinions: [{ id: 1 }],
    });
    expect(hit.url).toBe(
      "https://www.courtlistener.com/opinion/1479640/capone-v-united-states/",
    );
    expect(hit).toMatchObject({
      clusterId: 1479640,
      citations: ["56 F.2d 927"],
      opinionIds: [1],
    });
  });
});

const candidate = (over: Partial<CaseCandidate> = {}): CaseCandidate =>
  caseCandidateSchema.parse({
    schemaVersion: 1,
    kind: "case-candidate",
    id: "cand-test",
    name: "Test",
    summary: "Test case",
    caseType: "OTHER",
    jurisdiction: { country: "United States" },
    discoveredVia: [
      { url: "https://www.courtlistener.com/?q=x", title: "search" },
    ],
    knownPrimarySources: [
      { url: "https://www.courtlistener.com/opinion/1/x/", title: "opinion" },
    ],
    status: "CANDIDATE",
    createdAt: "2026-10-06",
    ...over,
  });

describe("case candidates", () => {
  it("only a named human can select or reject", () => {
    expect(() =>
      decideCandidate(candidate(), {
        status: "SELECTED",
        by: "skill:case-discovery",
        at: "2026-10-06",
      }),
    ).toThrow(/human/);
    const sel = decideCandidate(candidate(), {
      status: "SELECTED",
      by: "human:Adryan",
      at: "2026-10-06",
    });
    expect(sel.status).toBe("SELECTED");
    expect(validateCandidate(sel)).toEqual([]);
    expect(
      codes(validateCandidate(candidate({ status: "SELECTED" }))),
    ).toContain("CANDIDATE_DECISION_NOT_HUMAN");
  });

  it("requires a reason to reject", () => {
    expect(() =>
      decideCandidate(candidate(), {
        status: "REJECTED",
        by: "human:Adryan",
        at: "2026-10-06",
      }),
    ).toThrow(/reason/);
  });

  it("flags candidates without primary sources or with risky sensitivity", () => {
    expect(
      codes(validateCandidate(candidate({ knownPrimarySources: [] }))),
    ).toContain("CANDIDATE_NO_PRIMARY_SOURCES");
    expect(
      codes(
        validateCandidate(candidate({ sensitivityFlags: ["MINORS_INVOLVED"] })),
      ),
    ).toContain("CANDIDATE_MINORS");
  });

  it("the real proposed candidates validate and none was selected by the agent", () => {
    const dir = path.join(import.meta.dirname, "..", "data", "candidates");
    const all = readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) =>
        caseCandidateSchema.parse(
          JSON.parse(readFileSync(path.join(dir, f), "utf8")),
        ),
      );
    expect(all.length).toBeGreaterThanOrEqual(3);
    for (const c of all) {
      expect(
        validateCandidate(c).filter((i) => i.severity === "ERROR"),
      ).toEqual([]);
      if (c.status === "SELECTED" || c.status === "REJECTED")
        expect(c.decision?.by).toMatch(/^human:/);
      expect(
        c.knownPrimarySources.every((s) =>
          s.url.startsWith("https://www.courtlistener.com/opinion/"),
        ),
      ).toBe(true);
    }
  });
});

describe("source snapshots", () => {
  it("require a real SHA-256", () => {
    const base = {
      localPath: "snapshots/src-x.json",
      bytes: 10,
      contentType: "application/json",
      retrievedAt: "2026-10-06",
      method: "API",
    };
    expect(
      sourceSnapshotSchema.safeParse({ ...base, sha256: "abc" }).success,
    ).toBe(false);
    expect(
      sourceSnapshotSchema.safeParse({ ...base, sha256: "a".repeat(64) })
        .success,
    ).toBe(true);
  });

  it("are required for sources behind CORE claims in real cases", () => {
    const issues = issuesAfter((ws) => {
      ws.project.isSynthetic = false;
    });
    expect(codes(issues)).toContain("SOURCE_NOT_SNAPSHOTTED");
    expect(codes(issuesAfter(() => {}))).not.toContain(
      "SOURCE_NOT_SNAPSHOTTED",
    );
  });
});

describe("Gate 1 review packet", () => {
  it("matches excerpts verbatim, ignoring whitespace, case and curly quotes", () => {
    expect(
      excerptInText("No marks of force", "…safe. no  marks\nof FORCE on…"),
    ).toBe(true);
    expect(excerptInText("“not proof”", 'is "not proof".')).toBe(true);
    expect(excerptInText("marks of violence", "No marks of force")).toBe(false);
  });

  it("puts legal status, CORE claims, and excerpt checks in front of the reviewer", () => {
    const ws = fixture();
    const checks = new Map<string, ExcerptCheck>([
      ["evd-missing-report", "FOUND"],
      ["evd-missing-gazette", "NOT_FOUND"],
    ]);
    const md = buildReviewPacket(ws, checks, "2026-10-06T00:00:00Z");
    expect(md).toContain("## 1. Legal status of every named person");
    expect(md).toMatch(/\*\*Oren Tallis\*\* — CHARGED .* → ACQUITTED/);
    expect(md).toContain("`clm-payroll-missing` · SUPPORTED · FACT");
    expect(md).toContain("✅ found in snapshot");
    expect(md).toContain("❌ NOT found in snapshot");
    expect(md).toContain("SYNTHETIC FIXTURE");
    expect(md).toContain("## Gate 1 checklist");
  });
});
