import { parseSrt } from "@remotion/captions";
import { describe, expect, it } from "vitest";
import {
  qaReportSchema,
  youtubePackageSchema,
  type QaCheck,
} from "../src/domain";
import { captionLines, toAss, toSrt } from "../src/production/captions";
import {
  buildChapters,
  buildCredits,
  chapterProblems,
  formatTimestamp,
} from "../src/production/package";
import {
  buildQaReport,
  evaluateTechnicalQa,
  summarizeQa,
  type MediaProbe,
} from "../src/qa";
import { validateWorkspace } from "../src/validation";
import { codes, errorCodes, fixture, issuesAfter } from "./helpers";

const ws = fixture();
const m = ws.manifest!;
const durationSec = m.render.durationInFrames / m.render.fps;

const goodProbe = (): MediaProbe => ({
  durationSec,
  width: 1920,
  height: 1080,
  fps: 30,
  videoCodec: "h264",
  fileSizeBytes: 7_000_000,
  hasAudio: true,
  audioDurationSec: durationSec,
  silences: [{ startSec: 60, endSec: 61.5 }],
});

const status = (checks: QaCheck[], key: string) =>
  checks.find((c) => c.id.endsWith(key))?.status;

describe("technical QA", () => {
  it("fails when there is no render", () => {
    expect(status(evaluateTechnicalQa(null, ws), "render-exists")).toBe("FAIL");
  });

  it("passes a render that matches the manifest", () => {
    const checks = evaluateTechnicalQa(goodProbe(), ws);
    for (const key of [
      "duration",
      "resolution",
      "fps",
      "codec",
      "audio-present",
      "audio-duration",
      "silence",
      "assets",
      "caption-duration",
    ]) {
      expect(status(checks, key), key).toBe("PASS");
    }
  });

  it("catches wrong duration, resolution, frame rate, missing audio, and dead air", () => {
    const checks = evaluateTechnicalQa(
      {
        ...goodProbe(),
        durationSec: durationSec + 3,
        width: 1280,
        fps: 25,
        hasAudio: false,
        silences: undefined,
      },
      ws,
    );
    expect(status(checks, "duration")).toBe("FAIL");
    expect(status(checks, "resolution")).toBe("FAIL");
    expect(status(checks, "fps")).toBe("FAIL");
    expect(status(checks, "audio-present")).toBe("FAIL");
    const silent = evaluateTechnicalQa(
      { ...goodProbe(), silences: [{ startSec: 10, endSec: 20 }] },
      ws,
    );
    expect(status(silent, "silence")).toBe("FAIL");
  });

  it("fails when a manifest asset was not produced", () => {
    const broken = structuredClone(ws);
    broken.assets!.assets.find((a) => a.id === "ast-paper-texture")!.status =
      "FAILED";
    expect(status(evaluateTechnicalQa(goodProbe(), broken), "assets")).toBe(
      "FAIL",
    );
  });
});

describe("QA report", () => {
  const report = buildQaReport(ws, validateWorkspace(ws), goodProbe(), {
    generatedAt: "2026-09-30T00:00:00Z",
  });

  it("has a valid structure covering all three categories", () => {
    expect(qaReportSchema.safeParse(report).success).toBe(true);
    expect(new Set(report.checks.map((c) => c.category))).toEqual(
      new Set(["TECHNICAL", "VISUAL", "EDITORIAL"]),
    );
  });

  it("is never PASS while human checks are outstanding", () => {
    expect(
      report.checks.some((c) => c.status === "MANUAL_REQUIRED" && !c.automated),
    ).toBe(true);
    expect(report.overall).toBe("INCOMPLETE");
  });

  it("only passes once a human has resolved every manual check", () => {
    const resolved = report.checks.map((c) =>
      c.status === "MANUAL_REQUIRED"
        ? { ...c, status: "PASS" as const, reviewedBy: "human:Reviewer" }
        : c,
    );
    expect(summarizeQa(resolved)).toBe("PASS");
    expect(summarizeQa([...resolved, { ...resolved[0], status: "FAIL" }])).toBe(
      "FAIL",
    );
  });

  it("cannot be marked complete when its checks failed", () => {
    const issues = issuesAfter((w) => {
      w.qaReport!.overall = "PASS";
    });
    expect(errorCodes(issues)).toContain("QA_OVERALL_INCONSISTENT");
  });

  it("requires humans for manual reviews", () => {
    const issues = issuesAfter((w) => {
      const c = w.qaReport!.checks.find((x) => x.status === "MANUAL_REQUIRED")!;
      c.reviewedBy = "skill:video-qc@1";
    });
    expect(errorCodes(issues)).toContain("QA_REVIEW_NOT_HUMAN");
  });

  it("flags edited facts in editorial QA", () => {
    const edited = structuredClone(ws);
    edited.script!.units[6].text =
      "In December 1954, he was convicted of larceny.";
    const r = buildQaReport(edited, validateWorkspace(edited), goodProbe(), {
      generatedAt: "2026-09-30T00:00:00Z",
    });
    expect(status(r.checks, "legal-status")).toBe("FAIL");
    expect(status(r.checks, "captions-match")).toBe("FAIL");
  });
});

describe("caption mastering", () => {
  const a = ws.alignment!;

  it("builds readable lines that never cross a narration segment", () => {
    const lines = captionLines(a);
    const segEnds = a.segments.map((s) => s.endSec * 1000);
    for (const line of lines) {
      const seg = segEnds.findIndex((end) => line[0].startMs < end);
      expect(line.every((w) => w.startMs < segEnds[seg])).toBe(true);
      expect(
        line
          .map((w) => w.text)
          .join("")
          .trim().length,
      ).toBeLessThanOrEqual(42);
    }
  });

  it("writes SRT that round-trips through Remotion's parser with the verified text", () => {
    const srt = toSrt(a);
    const { captions } = parseSrt({ input: srt });
    const text = captions
      .map((c) => c.text.trim())
      .join(" ")
      .replace(/\s+/g, " ");
    expect(text).toBe(
      ws
        .script!.units.map((u) => u.text)
        .join(" ")
        .replace(/\s+/g, " "),
    );
  });

  it("writes an ASS file with styles and one dialogue event per line", () => {
    const ass = toAss(a);
    expect(ass).toMatch(/^\[Script Info\]/);
    expect(ass).toContain("[V4+ Styles]");
    expect((ass.match(/^Dialogue:/gm) ?? []).length).toBe(
      captionLines(a).length,
    );
  });
});

describe("YouTube package", () => {
  const p = ws.youtubePackage!;

  it("has a valid structure and validates cleanly", () => {
    expect(youtubePackageSchema.safeParse(p).success).toBe(true);
    const issues = validateWorkspace(ws).filter((i) =>
      i.path.startsWith("output/youtube-package.json"),
    );
    expect(issues).toEqual([]);
  });

  it("chapters follow YouTube's rules and come from measured timing", () => {
    expect(chapterProblems(p.chapters, durationSec)).toEqual([]);
    expect(
      buildChapters(ws.story!, m).map((c) => Math.floor(c.startSec)),
    ).toEqual(p.chapters.map((c) => c.startSec));
    expect(chapterProblems([{ startSec: 5, title: "a" }], 100)).toEqual(
      expect.arrayContaining(["first chapter must start at 0:00"]),
    );
    expect(formatTimestamp(3725)).toBe("1:02:05");
  });

  it("will not let metadata presume guilt or overstate the legal record", () => {
    const guilt = issuesAfter((w) => {
      w.youtubePackage!.titleCandidates[0].text =
        "The Bookkeeper Thief Who Got Away";
    });
    expect(errorCodes(guilt)).toContain("PACKAGE_GUILT_LABEL");
    const convicted = issuesAfter((w) => {
      w.youtubePackage!.titleCandidates[0].text =
        "Convicted: The Mill Payroll Case";
    });
    expect(errorCodes(convicted)).toContain("PACKAGE_LEGAL_TERM_UNSUPPORTED");
  });

  it("will not cite unverified claims for clickability", () => {
    const issues = issuesAfter((w) => {
      w.youtubePackage!.titleCandidates[0].claimIds.push("clm-rumored-debts");
    });
    expect(errorCodes(issues)).toContain("PACKAGE_UNSUPPORTED_CLAIM");
  });

  it("warns on clickbait phrasing", () => {
    const issues = issuesAfter((w) => {
      w.youtubePackage!.titleCandidates[0].text =
        "You Won't Believe What Happened at the Mill";
    });
    expect(codes(issues)).toContain("PACKAGE_CLICKBAIT");
  });

  it("requires every mandatory credit", () => {
    const issues = issuesAfter((w) => {
      const a = w.assets!.assets.find(
        (x) => x.id === "ast-office-illustration",
      )!;
      a.creditRequired = true;
      a.creditText = "Illustration: Example Studio";
    });
    expect(errorCodes(issues)).toContain("PACKAGE_CREDIT_MISSING");
    expect(buildCredits(ws).sourceNotes.map((s) => s.sourceId)).toEqual(
      p.sourceNotes.map((s) => s.sourceId),
    );
  });

  it("marks a synthetic case as fictional", () => {
    const issues = issuesAfter((w) => {
      w.youtubePackage!.description.text = "A payroll went missing in 1954.";
    });
    expect(errorCodes(issues)).toContain("PACKAGE_SYNTHETIC_UNMARKED");
  });
});
