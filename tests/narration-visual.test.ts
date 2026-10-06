import { describe, expect, it } from "vitest";
import {
  assetRecordSchema,
  caseVisualBibleSchema,
  LEGAL_STATUSES,
  VISUAL_STATES,
} from "../src/domain";
import {
  computeShotTimings,
  resolveBeatFrames,
  spansFromAlignment,
} from "../src/production/timing";
import { joinWavs, readWavInfo, wavHeader } from "../src/production/wav";
import { visualBibleVariables } from "../src/remotion/theme";
import { codes, errorCodes, find, fixture, issuesAfter } from "./helpers";

const silentWav = (sec: number, rate = 22050) => {
  const data = Math.round(sec * rate) * 2;
  const out = new Uint8Array(44 + data);
  out.set(wavHeader(rate, 1, 16, data));
  return out;
};

describe("WAV measurement", () => {
  it("reads duration from the file header, not an estimate", () => {
    const info = readWavInfo(silentWav(2.5));
    expect(info).toMatchObject({
      sampleRate: 22050,
      channels: 1,
      bitsPerSample: 16,
    });
    expect(info.durationSec).toBeCloseTo(2.5, 4);
  });

  it("rejects non-WAV input", () => {
    expect(() =>
      readWavInfo(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])),
    ).toThrow(/RIFF/);
  });

  it("joins takes with exact silences and reports where each take sits", () => {
    const { spans, info } = joinWavs(
      [silentWav(1), silentWav(2), silentWav(0.5)],
      [0.25, 0, 1],
    );
    const expected = [
      [0, 1],
      [1.25, 3.25],
      [3.25, 3.75],
    ];
    // Silences are whole samples: 0.25 s at 22.05 kHz is 5512.5 → 5513 samples.
    const oneSample = 1 / 22050;
    spans.forEach((s, i) => {
      expect(Math.abs(s.startSec - expected[i][0])).toBeLessThanOrEqual(
        oneSample,
      );
      expect(Math.abs(s.endSec - expected[i][1])).toBeLessThanOrEqual(
        oneSample,
      );
    });
    expect(Math.abs(info.durationSec - 4.75)).toBeLessThanOrEqual(oneSample);
  });

  it("refuses to join takes with different formats", () => {
    expect(() =>
      joinWavs([silentWav(1, 22050), silentWav(1, 44100)], [0, 0]),
    ).toThrow(/formats/);
  });
});

describe("narration artifact", () => {
  const ws = fixture();

  it("is real measured narration, honestly marked as draft", () => {
    expect(ws.narration!.status).toBe("MEASURED");
    expect(ws.narration!.provider.costTier).toBe("LOCAL");
    expect(ws.narration!.producedFromApprovedScript).toBe(false);
    expect(ws.narration!.isSynthetic).toBe(true);
  });

  it("goes stale when the script changes after narration", () => {
    const issues = issuesAfter((w) => {
      w.script!.units[5].text = "Tallis denied that he took the money.";
    });
    expect(errorCodes(issues)).toEqual(
      expect.arrayContaining([
        "NARRATION_STALE",
        "NARRATION_UNIT_STALE",
        "ALIGNMENT_TEXT_MISMATCH",
      ]),
    );
  });

  it("cannot claim MEASURED without a measured file", () => {
    const issues = issuesAfter((w) => {
      delete w.narration!.durationSec;
    });
    expect(errorCodes(issues)).toContain("NARRATION_NOT_MEASURED");
  });

  it("cannot claim MEASURED with incomplete takes", () => {
    const issues = issuesAfter((w) => {
      w.narration!.units[2].status = "FAILED";
      w.narration!.units[2].lastError = "tts crashed";
    });
    expect(errorCodes(issues)).toContain("NARRATION_INCOMPLETE");
  });
});

describe("narration alignment", () => {
  const ws = fixture();

  it("has one measured segment per script unit, in order", () => {
    const a = ws.alignment!;
    expect(a.alignmentSource).toBe("PER_UNIT_SYNTHESIS");
    expect(a.segments.map((s) => s.narrationUnitId)).toEqual(
      ws.script!.units.map((u) => u.id),
    );
    expect(a.audioDurationSec).toBeCloseTo(ws.narration!.durationSec!, 2);
  });

  it("rejects overlapping segments", () => {
    const issues = issuesAfter((w) => {
      w.alignment!.segments[3].startSec = w.alignment!.segments[2].startSec;
      w.alignment!.segments[3].durationSec =
        w.alignment!.segments[3].endSec - w.alignment!.segments[3].startSec;
    });
    expect(errorCodes(issues)).toContain("SEGMENT_OVERLAP");
  });

  it("rejects re-transcribed text that differs from the verified script", () => {
    const issues = issuesAfter((w) => {
      w.alignment!.segments[0].text =
        "On the morning of November 13, 1954, the payroll was gone.";
    });
    expect(errorCodes(issues)).toContain("ALIGNMENT_TEXT_MISMATCH");
  });

  it("rejects an alignment that does not match the measured audio", () => {
    const a = issuesAfter((w) => {
      w.alignment!.audioDurationSec += 3;
    });
    expect(errorCodes(a)).toContain("ALIGNMENT_DURATION_MISMATCH");
    const b = issuesAfter((w) => {
      w.alignment!.narrationId = "narr-other";
    });
    expect(errorCodes(b)).toContain("ALIGNMENT_NARRATION_MISMATCH");
  });

  it("rejects segments that do not cover the script", () => {
    const issues = issuesAfter((w) => {
      w.alignment!.segments.pop();
    });
    expect(errorCodes(issues)).toContain("ALIGNMENT_UNIT_COUNT");
  });
});

describe("shot timing from measured narration", () => {
  const ws = fixture();
  const m = ws.manifest!;
  const fps = m.render.fps;

  it("the fixture manifest is timed to measured audio", () => {
    expect(m.timingSource).toBe("AUDIO");
    expect(m.alignmentSource).toBe("PER_UNIT_SYNTHESIS");
    expect(m.narration!.durationSec).toBeCloseTo(ws.narration!.durationSec!, 3);
    expect(m.render.durationInFrames).toBe(
      Math.round(ws.alignment!.audioDurationSec * fps),
    );
  });

  it("cuts each shot where its first narration segment starts", () => {
    const segStart = new Map(
      ws.alignment!.segments.map((s) => [s.narrationUnitId, s.startSec]),
    );
    m.shots.forEach((shot, i) => {
      if (i === 0) expect(shot.startFrame).toBe(0);
      else
        expect(shot.startFrame).toBe(
          Math.round(segStart.get(shot.narrationIds[0])! * fps),
        );
    });
  });

  it("keeps pauses inside shots so picture never drifts from sound", () => {
    const plan = ws.visualPlan!;
    const spans = [
      { narrationId: "nu-001", startMs: 0, endMs: 1000 },
      { narrationId: "nu-002", startMs: 3000, endMs: 4000 }, // 2 s pause before
    ];
    const two = {
      ...plan,
      shots: [
        { ...plan.shots[0], narrationIds: ["nu-001"] },
        { ...plan.shots[1], narrationIds: ["nu-002"] },
      ],
    };
    const t = computeShotTimings(two, spans, 30, 5000);
    expect(t.map((x) => [x.startFrame, x.durationInFrames])).toEqual([
      [0, 90],
      [90, 60],
    ]);
  });

  it("never accumulates rounding drift", () => {
    const spans = ws.alignment!.segments.map((s) => ({
      narrationId: s.narrationUnitId,
      startMs: s.startSec * 1000,
      endMs: s.endSec * 1000,
    }));
    const t = computeShotTimings(
      ws.visualPlan!,
      spans,
      fps,
      ws.alignment!.audioDurationSec * 1000,
    );
    const last = t.at(-1)!;
    expect(last.startFrame + last.durationInFrames).toBe(
      Math.round(ws.alignment!.audioDurationSec * fps),
    );
  });
});

describe("visual states (scene beats)", () => {
  const ws = fixture();

  it("supports the visual-state vocabulary and resolves states inside their shots", () => {
    expect(VISUAL_STATES).toEqual(
      expect.arrayContaining([
        "ESTABLISH",
        "HIGHLIGHT",
        "DIM_OTHERS",
        "HANDOFF",
        "HOLD",
      ]),
    );
    const shot = ws.manifest!.shots.find((s) => s.shotId === "shot-01")!;
    expect(shot.states.map((s) => s.state)).toEqual([
      "ESTABLISH",
      "HIGHLIGHT",
      "DIM_OTHERS",
    ]);
    for (const s of ws.manifest!.shots)
      for (const st of s.states)
        expect(st.atFrame).toBeLessThan(s.durationInFrames);
  });

  it("anchors a state to the measured start of its narration segment", () => {
    const shot = find(ws.visualPlan!.shots, "shot-01");
    const spans = spansFromAlignment(ws.alignment!);
    const [, highlight] = resolveBeatFrames(shot, 0, spans, 30);
    const nu002 = ws.alignment!.segments.find(
      (s) => s.narrationUnitId === "nu-002",
    )!;
    expect(highlight.atFrame).toBe(Math.round((nu002.startSec + 0.5) * 30));
  });

  it("rejects a state that would land after its shot ends", () => {
    const issues = issuesAfter((w) => {
      find(w.visualPlan!.shots, "shot-01").beats[2].offsetSec = 60;
    });
    expect(errorCodes(issues)).toContain("BEAT_OUTSIDE_SHOT_DURATION");
  });

  it("the renderer receives the dim state as a frame, not a guess", async () => {
    const { buildSceneSpecs } =
      await import("../src/remotion/adapters/scene-spec");
    const scene = buildSceneSpecs(ws, ws.manifest!).find(
      (s) => s.shotId === "shot-01",
    )!;
    const states = ws.manifest!.shots[0].states;
    expect(scene.body.kind).toBe("document");
    if (scene.body.kind === "document") {
      expect(scene.body.highlightAtFrame).toBe(states[1].atFrame);
      expect(scene.body.dimAtFrame).toBe(states[2].atFrame);
    }
  });
});

describe("case visual bible", () => {
  const ws = fixture();

  it("validates and is referenced by the plan and manifest", () => {
    expect(ws.visualBible!.revision).toBe(1);
    expect(ws.visualPlan!.visualBibleRevision).toBe(1);
    expect(ws.manifest!.visualBibleRevision).toBe(1);
  });

  it("makes plan and manifest stale when the bible is revised", () => {
    const issues = issuesAfter((w) => {
      w.visualBible!.revision = 2;
    });
    expect(errorCodes(issues)).toEqual(
      expect.arrayContaining([
        "VISUAL_PLAN_STALE_BIBLE",
        "MANIFEST_STALE_BIBLE",
      ]),
    );
  });

  it("cannot switch off reconstruction labeling", () => {
    const raw = structuredClone(ws.visualBible!) as unknown as {
      reconstructionTreatment: { alwaysLabeled: boolean };
    };
    raw.reconstructionTreatment.alwaysLabeled = false;
    expect(caseVisualBibleSchema.safeParse(raw).success).toBe(false);
  });

  it("warns when default negative constraints are dropped", () => {
    const issues = issuesAfter((w) => {
      w.visualBible!.negativeConstraints = ["No lens flares"];
    });
    expect(codes(issues)).toContain("NEGATIVE_CONSTRAINT_DROPPED");
  });

  it("rejects references marked usable without cleared rights", () => {
    const issues = issuesAfter((w) => {
      w.visualBible!.approvedReferences.push({
        description: "a film still",
        rightsStatus: "UNKNOWN",
        usage: "USABLE_IN_VIDEO",
      });
    });
    expect(errorCodes(issues)).toContain("REFERENCE_RIGHTS");
  });

  it("drives the renderer's theme through CSS variables", () => {
    const vars = visualBibleVariables(ws.visualBible) as Record<string, string>;
    expect(vars["--pe-color-ground"]).toBe(ws.visualBible!.palette.ground);
    expect(vars["--pe-font-mono"]).toBe(ws.visualBible!.typography.records);
    expect(visualBibleVariables(undefined)).toEqual({});
  });
});

describe("asset production status", () => {
  it("defaults new fields so older records still parse", () => {
    const a = assetRecordSchema.parse({
      id: "ast-x",
      mediaType: "IMAGE",
      origin: "ARCHIVAL",
      localPath: "images/x.jpg",
      rightsStatus: "UNKNOWN",
      creditRequired: false,
      approval: { status: "PENDING" },
    });
    expect(a).toMatchObject({
      status: "PENDING",
      attemptCount: 0,
      estimatedCostUsd: 0,
    });
  });

  it("blocks REVIEW/FINAL manifests that use unproduced assets", () => {
    const issues = issuesAfter((w) => {
      w.manifest!.stage = "REVIEW";
      find(w.assets!.assets, "ast-office-illustration").status = "FAILED";
      find(w.assets!.assets, "ast-office-illustration").lastError =
        "download failed";
    });
    expect(errorCodes(issues)).toContain("ASSET_NOT_PRODUCED");
  });

  it("flags assets that would cost money", () => {
    const issues = issuesAfter((w) => {
      find(w.assets!.assets, "ast-mill-photo").estimatedCostUsd = 4;
    });
    expect(codes(issues)).toContain("PAID_ASSET");
  });

  it("treats Remotion-generated graphics as non-authentic", () => {
    const issues = issuesAfter((w) => {
      find(w.assets!.assets, "ast-office-illustration").origin =
        "REMOTION_GENERATED";
      find(w.visualPlan!.shots, "shot-03").representation = {
        type: "AUTHENTIC",
      };
    });
    expect(errorCodes(issues)).toContain("SYNTHETIC_ASSET_AS_AUTHENTIC");
  });
});

describe("legal statuses", () => {
  it("distinguish suspicion and arrest from charge and conviction", () => {
    expect(LEGAL_STATUSES).toEqual(
      expect.arrayContaining([
        "SUSPECTED",
        "ARRESTED",
        "CHARGED",
        "CONVICTED",
        "ACQUITTED",
      ]),
    );
  });

  it("flag an arrest stated without a supporting legal-status claim", () => {
    const issues = issuesAfter((w) => {
      find(w.script!.units, "nu-006").text =
        "Tallis was arrested and denied taking the money.";
    });
    expect(
      issues.find((i) => i.code === "LEGAL_TERM_UNSUPPORTED")?.severity,
    ).toBe("WARNING");
  });
});
