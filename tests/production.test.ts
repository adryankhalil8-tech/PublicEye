import { describe, expect, it } from "vitest";
import {
  buildManifest,
  deserializeManifest,
  serializeManifest,
} from "../src/production/manifest";
import { buildSceneSpecs } from "../src/remotion/adapters/scene-spec";
import { validateWorkspace } from "../src/validation";
import { codes, errorCodes, find, fixture, issuesAfter } from "./helpers";

const GENERATED_AT = "2026-09-30T00:00:00Z";

describe("shot references", () => {
  it("flags shots that reference unknown narration", () => {
    const issues = issuesAfter((ws) => {
      ws.visualPlan!.shots[0].narrationIds.push("nu-999");
    });
    expect(errorCodes(issues)).toContain("BROKEN_NARRATION_REF");
  });

  it("forbids the same narration in two shots", () => {
    const issues = issuesAfter((ws) => {
      ws.visualPlan!.shots[1].narrationIds.push("nu-001");
    });
    expect(errorCodes(issues)).toContain("NARRATION_IN_MULTIPLE_SHOTS");
  });

  it("warns when narration has no shot", () => {
    const issues = issuesAfter((ws) => {
      ws.visualPlan!.shots = ws.visualPlan!.shots.filter(
        (s) => s.id !== "shot-11",
      );
    });
    expect(codes(issues)).toContain("NARRATION_NOT_COVERED");
  });

  it("rejects on-screen text built on unverified claims", () => {
    const issues = issuesAfter((ws) => {
      ws.visualPlan!.shots[0].onScreenText.push({
        text: "Gambling debts",
        role: "LABEL",
        claimIds: ["clm-rumored-debts"],
      });
    });
    expect(errorCodes(issues)).toContain("ONSCREEN_TEXT_UNSUPPORTED");
  });
});

describe("reconstruction labeling", () => {
  it("requires RECONSTRUCTION shots to carry a label", () => {
    const issues = issuesAfter((ws) => {
      find(ws.visualPlan!.shots, "shot-03").representation = {
        type: "AUTHENTIC",
      };
    });
    expect(errorCodes(issues)).toContain("RECONSTRUCTION_UNLABELED");
    expect(errorCodes(issues)).toContain("SYNTHETIC_ASSET_AS_AUTHENTIC");
  });

  it("requires the AI label for AI-generated imagery", () => {
    const issues = issuesAfter((ws) => {
      find(ws.assets!.assets, "ast-office-illustration").origin =
        "AI_GENERATED";
    });
    expect(errorCodes(issues)).toContain("AI_LABEL_REQUIRED");
  });

  it("never fulfils an authentic-only requirement with generated media", () => {
    const issues = issuesAfter((ws) => {
      find(
        ws.visualPlan!.assetRequirements,
        "req-office-illustration",
      ).mustBeAuthentic = true;
    });
    expect(errorCodes(issues)).toContain("AUTHENTIC_REQUIREMENT_VIOLATED");
  });

  it("puts the disclosure label on every illustrative scene", () => {
    const ws = fixture();
    const scenes = buildSceneSpecs(ws, ws.manifest!);
    expect(
      find(
        scenes.map((s) => ({ ...s, id: s.shotId })),
        "shot-03",
      ).representationLabel,
    ).toBe("ILLUSTRATION");
    expect(
      scenes.filter((s) => s.representationLabel).map((s) => s.shotId),
    ).toEqual(["shot-03"]);
  });
});

describe("asset provenance", () => {
  it("never approves UNKNOWN rights", () => {
    const issues = issuesAfter((ws) => {
      const a = find(ws.assets!.assets, "ast-mill-photo");
      a.approval = {
        status: "APPROVED",
        approvedBy: "human:x",
        approvedAt: "2026-09-29",
      };
    });
    expect(errorCodes(issues)).toContain("ASSET_APPROVED_WITHOUT_RIGHTS");
  });

  it("requires a human and a rationale for fair-use approvals", () => {
    const issues = issuesAfter((ws) => {
      const a = find(ws.assets!.assets, "ast-mill-photo");
      a.rightsStatus = "FAIR_USE_REVIEW";
      a.approval = {
        status: "APPROVED",
        approvedBy: "skill:asset-research@1",
        approvedAt: "2026-09-29",
      };
    });
    expect(errorCodes(issues)).toContain("FAIR_USE_NEEDS_HUMAN");
  });

  it("requires credit text when credit is required", () => {
    const issues = issuesAfter((ws) => {
      delete find(ws.assets!.assets, "ast-mill-photo").creditText;
    });
    expect(errorCodes(issues)).toContain("ASSET_CREDIT_MISSING");
  });
});

describe("production manifest", () => {
  const ws = fixture();
  const manifest = buildManifest(ws, { generatedAt: GENERATED_AT });

  it("matches the committed fixture manifest (not stale)", () => {
    expect(manifest).toEqual(ws.manifest);
    expect(codes(validateWorkspace(ws))).not.toContain("MANIFEST_STALE");
  });

  it("round-trips through serialization", () => {
    const json = serializeManifest(manifest);
    expect(json.endsWith("\n")).toBe(true);
    expect(deserializeManifest(json)).toEqual(manifest);
  });

  it("lays shots end to end at 1920x1080 / 30fps", () => {
    expect(manifest.render).toMatchObject({
      width: 1920,
      height: 1080,
      fps: 30,
    });
    let frame = 0;
    for (const s of manifest.shots) {
      expect(s.startFrame).toBe(frame);
      frame += s.durationInFrames;
    }
    expect(manifest.render.durationInFrames).toBe(frame);
  });

  it("includes only assets that shots actually use — unknown-rights assets stay out", () => {
    expect(manifest.assets.map((a) => a.assetId).sort()).toEqual([
      "ast-office-illustration",
      "ast-paper-texture",
    ]);
    expect(manifest.assets.every((a) => a.approved)).toBe(true);
  });

  it("refuses FINAL without QC, a passing QA report, and approved-script narration", () => {
    const issues = issuesAfter((w) => {
      w.manifest!.stage = "FINAL";
    });
    expect(errorCodes(issues)).toEqual(
      expect.arrayContaining([
        "FINAL_WITHOUT_QC",
        "FINAL_QA_NOT_PASSED",
        "MANIFEST_DRAFT_NARRATION",
      ]),
    );
  });

  it("refuses FINAL/REVIEW timed by word-count estimates", () => {
    const issues = issuesAfter((w) => {
      w.manifest!.stage = "REVIEW";
      w.manifest!.timingSource = "ESTIMATED";
    });
    expect(errorCodes(issues)).toContain("MANIFEST_TIMING_NOT_MEASURED");
  });

  it("detects a stale manifest after the script changes", () => {
    const issues = issuesAfter((w) => {
      w.script!.units[0].text +=
        " And a much longer sentence was added here afterward.";
    });
    expect(codes(issues)).toContain("MANIFEST_STALE");
  });
});
