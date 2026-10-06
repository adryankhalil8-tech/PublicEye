import { describe, expect, it } from "vitest";
import { exceedsCeiling } from "../src/research/authority";
import { assessClaimSupport } from "../src/research/verification";
import { errorCodes, find, fixture, issuesAfter } from "./helpers";

describe("duplicate IDs", () => {
  it("catches duplicates across different files", () => {
    const issues = issuesAfter((ws) => {
      ws.timeline.events[0].id = ws.timeline.events[1].id;
    });
    expect(errorCodes(issues)).toContain("DUPLICATE_ID");
  });
});

describe("source references", () => {
  it("flags claims that cite unknown sources", () => {
    const issues = issuesAfter((ws) => {
      find(ws.claims.claims, "clm-payroll-missing").sourceIds.push(
        "src-does-not-exist",
      );
    });
    expect(errorCodes(issues)).toContain("BROKEN_SOURCE_REF");
  });

  it("flags evidence whose source is not listed on the claim", () => {
    const issues = issuesAfter((ws) => {
      const c = find(ws.claims.claims, "clm-payroll-missing");
      c.sourceIds = c.sourceIds.filter((s) => s !== "src-gazette-1954");
    });
    expect(issues.map((i) => i.code)).toContain("EVIDENCE_SOURCE_NOT_LISTED");
  });
});

describe("source authority", () => {
  it("never lets a blog or listicle be PRIMARY", () => {
    const issues = issuesAfter((ws) => {
      find(ws.sources.sources, "src-listicle").authorityLevel = "PRIMARY";
    });
    expect(errorCodes(issues)).toContain("AUTHORITY_ABOVE_CEILING");
    expect(
      exceedsCeiling({
        ...find(fixture().sources.sources, "src-listicle"),
        authorityLevel: "SECONDARY",
      }),
    ).toBe(true);
  });

  it("allows lowering a source below its type's ceiling", () => {
    const issues = issuesAfter((ws) => {
      find(ws.sources.sources, "src-gazette-1954").authorityLevel = "SECONDARY";
    });
    expect(errorCodes(issues)).not.toContain("AUTHORITY_ABOVE_CEILING");
  });
});

describe("claim verification policy", () => {
  it("rejects SUPPORTED when only a discovery source supports the claim", () => {
    const issues = issuesAfter((ws) => {
      find(ws.claims.claims, "clm-no-other-charges").status = "SUPPORTED";
    });
    expect(errorCodes(issues)).toContain("CLAIM_STATUS_EXCEEDS_EVIDENCE");
  });

  it("requires a PRIMARY or two independent strong sources for CORE claims", () => {
    const ws = fixture();
    const sources = new Map(ws.sources.sources.map((s) => [s.id, s]));
    const claim = structuredClone(find(ws.claims.claims, "clm-not-recovered"));
    expect(assessClaimSupport(claim, sources).maxJustifiedStatus).toBe(
      "SUPPORTED",
    );
    claim.importance = "CORE";
    // Two articles from the SAME publisher count once.
    claim.evidence.push({
      id: "evd-extra",
      stance: "SUPPORTS",
      reference: { sourceId: "src-gazette-1954" },
    });
    const result = assessClaimSupport(claim, sources);
    expect(result.maxJustifiedStatus).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.reasons.join()).toMatch(/CORE/);
  });

  it("requires PRIMARY or STRONG_SECONDARY support for legal status", () => {
    const issues = issuesAfter((ws) => {
      find(ws.sources.sources, "src-court-opinion").sourceType = "CASE_SUMMARY";
      find(ws.sources.sources, "src-court-opinion").authorityLevel =
        "SECONDARY";
    });
    expect(errorCodes(issues)).toContain("CLAIM_STATUS_EXCEEDS_EVIDENCE");
  });

  it("requires quotes to appear verbatim in an evidence excerpt", () => {
    const issues = issuesAfter((ws) => {
      const c = find(ws.claims.claims, "clm-judge-quote");
      if (c.assertion.type === "QUOTE")
        c.assertion.quoteText = "Suspicion is never proof.";
    });
    expect(errorCodes(issues)).toContain("CLAIM_STATUS_EXCEEDS_EVIDENCE");
  });

  it("caps a claim at DISPUTED when equal-authority sources contradict it", () => {
    const ws = fixture();
    const sources = new Map(ws.sources.sources.map((s) => [s.id, s]));
    const claim = structuredClone(
      find(ws.claims.claims, "clm-payroll-missing"),
    );
    claim.evidence.push({
      id: "evd-contra",
      stance: "CONTRADICTS",
      reference: { sourceId: "src-court-opinion" },
    });
    expect(assessClaimSupport(claim, sources).maxJustifiedStatus).toBe(
      "DISPUTED",
    );
  });

  it("warns about unverified CORE claims", () => {
    const issues = issuesAfter((ws) => {
      find(ws.claims.claims, "clm-rumored-debts").importance = "CORE";
    });
    expect(issues.find((i) => i.code === "UNVERIFIED_CLAIM")?.severity).toBe(
      "WARNING",
    );
  });
});

describe("legal status on people", () => {
  it("rejects a status entry that cites a claim of a different status", () => {
    const issues = issuesAfter((ws) => {
      find(ws.entities.people, "per-oren-tallis").legalStatuses[1].status =
        "CONVICTED";
    });
    expect(errorCodes(issues)).toContain("LEGAL_STATUS_MISMATCH");
  });

  it("rejects a status resting on an unsupported claim", () => {
    const issues = issuesAfter((ws) => {
      find(ws.claims.claims, "clm-tallis-charged").status = "UNVERIFIED";
    });
    expect(errorCodes(issues)).toContain("LEGAL_STATUS_UNSUPPORTED");
  });
});

describe("synthetic/real separation", () => {
  it("forbids real URLs in a synthetic case", () => {
    const issues = issuesAfter((ws) => {
      ws.sources.sources[0].url = "https://www.fbi.gov/history/famous-cases";
    });
    expect(errorCodes(issues)).toContain("SYNTHETIC_CASE_REAL_SOURCE");
  });

  it("forbids placeholder URLs in a real case", () => {
    const issues = issuesAfter((ws) => {
      ws.project.isSynthetic = false;
    });
    expect(errorCodes(issues)).toContain("REAL_CASE_PLACEHOLDER_SOURCE");
  });
});
