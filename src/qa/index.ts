import type {
  CaseWorkspace,
  QaCheck,
  QaCheckStatus,
  QaReport,
  ShotType,
} from "../domain";
import { qaReportSchema, SCHEMA_VERSION } from "../domain";
import type { ValidationIssue } from "../validation/issues";

/**
 * Automated QA. Every check says whether it is automated; anything a machine
 * cannot judge (legibility, cropping, fairness) is MANUAL_REQUIRED and keeps
 * the report INCOMPLETE until a human records a result. Automated QA never
 * replaces human editorial review.
 */

/** What we learn from probing a rendered file (ffprobe or similar). */
export type MediaProbe = {
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  videoCodec: string;
  fileSizeBytes: number;
  hasAudio: boolean;
  audioDurationSec?: number;
  /** Silent stretches found by a silence detector, if one ran. */
  silences?: { startSec: number; endSec: number }[];
};

const check = (
  category: QaCheck["category"],
  key: string,
  name: string,
  status: QaCheckStatus,
  detail?: string,
  automated = true,
): QaCheck => ({
  id: `qa-${category.toLowerCase()}-${key}`,
  category,
  name,
  status,
  automated,
  detail,
});

const TOLERANCE_SEC = 0.25;
/** Longer than any deliberate narration pause in the script conventions. */
export const MAX_SILENCE_SEC = 4;

export const evaluateTechnicalQa = (
  probe: MediaProbe | null,
  ws: CaseWorkspace,
): QaCheck[] => {
  const m = ws.manifest;
  const T = "TECHNICAL" as const;
  if (!probe) {
    return [
      check(
        T,
        "render-exists",
        "Rendered master exists",
        "FAIL",
        "no render found — run the render stage",
      ),
    ];
  }
  const checks: QaCheck[] = [
    check(T, "render-exists", "Rendered master exists", "PASS"),
  ];
  if (!m)
    return [
      ...checks,
      check(T, "manifest", "Manifest available", "FAIL", "no manifest.json"),
    ];

  const expectedSec = m.render.durationInFrames / m.render.fps;
  const dur = Math.abs(probe.durationSec - expectedSec) <= TOLERANCE_SEC;
  checks.push(
    check(
      T,
      "duration",
      "Duration matches manifest",
      dur ? "PASS" : "FAIL",
      `${probe.durationSec.toFixed(2)}s vs ${expectedSec.toFixed(2)}s`,
    ),
  );
  const res =
    probe.width === m.render.width && probe.height === m.render.height;
  checks.push(
    check(
      T,
      "resolution",
      "Resolution",
      res ? "PASS" : "FAIL",
      `${probe.width}x${probe.height}`,
    ),
  );
  checks.push(
    check(
      T,
      "fps",
      "Frame rate",
      Math.abs(probe.fps - m.render.fps) < 0.01 ? "PASS" : "FAIL",
      `${probe.fps} fps`,
    ),
  );
  checks.push(
    check(
      T,
      "codec",
      "Video codec",
      /^(h264|avc1)$/i.test(probe.videoCodec) ? "PASS" : "WARN",
      probe.videoCodec,
    ),
  );
  checks.push(
    check(
      T,
      "file-size",
      "File size",
      probe.fileSizeBytes > 0 ? "PASS" : "FAIL",
      `${(probe.fileSizeBytes / 1e6).toFixed(1)} MB`,
    ),
  );

  const expectsAudio = !!m.narration;
  if (!probe.hasAudio) {
    checks.push(
      check(
        T,
        "audio-present",
        "Audio present",
        expectsAudio ? "FAIL" : "WARN",
        expectsAudio
          ? "manifest has narration but the file has no audio"
          : "no narration in this render (draft)",
      ),
    );
  } else {
    checks.push(check(T, "audio-present", "Audio present", "PASS"));
    if (m.narration && probe.audioDurationSec !== undefined) {
      const ok =
        probe.audioDurationSec + TOLERANCE_SEC >= m.narration.durationSec;
      checks.push(
        check(
          T,
          "audio-duration",
          "Audio covers narration",
          ok ? "PASS" : "FAIL",
          `${probe.audioDurationSec.toFixed(2)}s audio vs ${m.narration.durationSec.toFixed(2)}s narration`,
        ),
      );
    }
  }
  if (probe.silences === undefined) {
    checks.push(
      check(
        T,
        "silence",
        "No unexpected silence",
        expectsAudio ? "MANUAL_REQUIRED" : "NOT_RUN",
        "no silence detection ran",
      ),
    );
  } else {
    const long = probe.silences.filter(
      (s) => s.endSec - s.startSec > MAX_SILENCE_SEC,
    );
    checks.push(
      check(
        T,
        "silence",
        "No unexpected silence",
        long.length ? "FAIL" : "PASS",
        long
          .map((s) => `${s.startSec.toFixed(1)}–${s.endSec.toFixed(1)}s`)
          .join(", ") || undefined,
      ),
    );
  }

  const missing = m.assets.filter((a) => {
    const rec = ws.assets?.assets.find((x) => x.id === a.assetId);
    return !rec || rec.status !== "COMPLETE";
  });
  checks.push(
    check(
      T,
      "assets",
      "All manifest assets produced",
      missing.length ? "FAIL" : "PASS",
      missing.map((a) => a.assetId).join(", ") || undefined,
    ),
  );

  const lastWord = ws.alignment?.words.at(-1);
  if (lastWord) {
    const ok = lastWord.endMs / 1000 <= probe.durationSec + TOLERANCE_SEC;
    checks.push(
      check(
        T,
        "caption-duration",
        "Captions fit the video",
        ok ? "PASS" : "FAIL",
        `last caption ends ${(lastWord.endMs / 1000).toFixed(2)}s`,
      ),
    );
  } else {
    checks.push(
      check(
        T,
        "caption-duration",
        "Captions fit the video",
        "NOT_RUN",
        "no word timings",
      ),
    );
  }
  return checks;
};

/** Shot types a Phase-0/1 renderer draws as a placeholder when no asset exists. */
const ASSET_SHOT_TYPES: ShotType[] = [
  "ARCHIVAL_PHOTO",
  "PORTRAIT",
  "LOCATION",
  "ATMOSPHERIC_BROLL",
  "RECONSTRUCTION",
];

const has = (issues: ValidationIssue[], codes: string[]) =>
  issues.filter((i) => i.severity === "ERROR" && codes.includes(i.code));

export const evaluateVisualQa = (
  ws: CaseWorkspace,
  issues: ValidationIssue[],
): QaCheck[] => {
  const V = "VISUAL" as const;
  const shots = ws.manifest?.shots ?? [];
  const checks: QaCheck[] = [];

  let run = 1;
  let maxRun = shots.length ? 1 : 0;
  for (let i = 1; i < shots.length; i++) {
    run = shots[i].shotType === shots[i - 1].shotType ? run + 1 : 1;
    maxRun = Math.max(maxRun, run);
  }
  checks.push(
    check(
      V,
      "repetition",
      "No long runs of the same shot type",
      maxRun > 3 ? "WARN" : "PASS",
      `longest run: ${maxRun}`,
    ),
  );

  const counts = new Map<string, number>();
  shots.forEach((s) =>
    counts.set(s.shotType, (counts.get(s.shotType) ?? 0) + 1),
  );
  const overused = [...counts].filter(
    ([, n]) => shots.length >= 8 && n / shots.length > 0.4,
  );
  checks.push(
    check(
      V,
      "overuse",
      "No overused visual pattern",
      overused.length ? "WARN" : "PASS",
      overused.map(([t, n]) => `${t} ×${n}`).join(", ") || undefined,
    ),
  );

  const placeholders = shots.filter(
    (s) =>
      s.shotType === "DATA_VISUALIZATION" ||
      (ASSET_SHOT_TYPES.includes(s.shotType) && s.assetIds.length === 0),
  );
  checks.push(
    check(
      V,
      "placeholders",
      "No placeholder visuals",
      placeholders.length
        ? ws.manifest?.stage === "FINAL"
          ? "FAIL"
          : "WARN"
        : "PASS",
      placeholders.map((s) => s.shotId).join(", ") || undefined,
    ),
  );

  const labels = has(issues, [
    "RECONSTRUCTION_UNLABELED",
    "SYNTHETIC_ASSET_AS_AUTHENTIC",
    "AI_LABEL_REQUIRED",
  ]);
  checks.push(
    check(
      V,
      "reconstruction-labels",
      "Reconstructions labeled",
      labels.length ? "FAIL" : "PASS",
      labels.map((i) => i.path).join(", ") || undefined,
    ),
  );

  const bibleOk =
    !ws.visualBible ||
    ws.manifest?.visualBibleRevision === ws.visualBible.revision;
  checks.push(
    check(
      V,
      "style-consistency",
      "Rendered against the current visual bible",
      bibleOk ? "PASS" : "FAIL",
      `manifest rev ${ws.manifest?.visualBibleRevision ?? "none"}, bible rev ${ws.visualBible?.revision ?? "none"}`,
    ),
  );

  for (const [key, name] of [
    ["composition", "Composition, cropping, and framing"],
    ["document-legibility", "Documents readable at 1080p"],
    ["safe-area", "Text inside safe areas"],
  ] as const) {
    checks.push(
      check(
        V,
        key,
        name,
        "MANUAL_REQUIRED",
        "requires watching the render",
        false,
      ),
    );
  }
  return checks;
};

const normalizeText = (s: string) => s.replace(/\s+/g, " ").trim();

export const evaluateEditorialQa = (
  ws: CaseWorkspace,
  issues: ValidationIssue[],
): QaCheck[] => {
  const E = "EDITORIAL" as const;
  const rows: [string, string, string[]][] = [
    [
      "claims-supported",
      "Script claims remain supported",
      [
        "SCRIPT_USES_UNVERIFIED_CLAIM",
        "SCRIPT_FRAMING_MISMATCH",
        "UNSOURCED_NARRATION",
        "CLAIM_STATUS_EXCEEDS_EVIDENCE",
      ],
    ],
    [
      "legal-status",
      "Legal statuses correct",
      [
        "LEGAL_TERM_UNSUPPORTED",
        "LEGAL_STATUS_MISMATCH",
        "LEGAL_STATUS_UNSUPPORTED",
      ],
    ],
    ["quotes", "Quotes match sources", ["UNSOURCED_QUOTE"]],
    [
      "dates",
      "Dates and chronology correct",
      ["TIMELINE_ORDER", "INVALID_DATE_RANGE", "EVENT_CERTAINTY_OVERSTATED"],
    ],
    [
      "visual-evidence",
      "Visuals do not misrepresent evidence",
      [
        "SYNTHETIC_ASSET_AS_AUTHENTIC",
        "ONSCREEN_TEXT_UNSUPPORTED",
        "AUTHENTIC_REQUIREMENT_VIOLATED",
      ],
    ],
    ["attribution", "Required attribution present", ["ATTRIBUTION_DROPPED"]],
  ];
  const checks = rows.map(([key, name, codes]) => {
    const found = has(issues, codes);
    return check(
      E,
      key,
      name,
      found.length ? "FAIL" : "PASS",
      found.map((i) => `${i.code} ${i.path}`).join("; ") || undefined,
    );
  });

  if (ws.alignment && ws.script) {
    const mismatched = ws.alignment.segments.filter((s) => {
      const unit = ws.script!.units.find((u) => u.id === s.narrationUnitId);
      return !unit || normalizeText(unit.text) !== normalizeText(s.text);
    });
    const words = normalizeText(ws.alignment.words.map((w) => w.text).join(""));
    const script = normalizeText(ws.script.units.map((u) => u.text).join(" "));
    const ok =
      mismatched.length === 0 &&
      (ws.alignment.words.length === 0 || words === script);
    checks.push(
      check(
        E,
        "captions-match",
        "Captions match narration script",
        ok ? "PASS" : "FAIL",
        mismatched.map((s) => s.id).join(", ") || undefined,
      ),
    );
  } else {
    checks.push(
      check(
        E,
        "captions-match",
        "Captions match narration script",
        "NOT_RUN",
        "no alignment",
      ),
    );
  }
  checks.push(
    check(
      E,
      "human-review",
      "Human editorial review of the full video",
      "MANUAL_REQUIRED",
      "a person must watch it against the claim ledger",
      false,
    ),
  );
  return checks;
};

/** PASS only if nothing failed and nothing is left for a human. */
export const summarizeQa = (checks: QaCheck[]): QaReport["overall"] => {
  if (checks.some((c) => c.status === "FAIL")) return "FAIL";
  if (
    checks.some(
      (c) =>
        c.status === "NOT_RUN" ||
        (c.status === "MANUAL_REQUIRED" && !c.reviewedBy),
    )
  )
    return "INCOMPLETE";
  return "PASS";
};

export const buildQaReport = (
  ws: CaseWorkspace,
  issues: ValidationIssue[],
  probe: MediaProbe | null,
  opts: { generatedAt: string; renderPath?: string },
): QaReport => {
  const checks = [
    ...evaluateTechnicalQa(probe, ws),
    ...evaluateVisualQa(ws, issues),
    ...evaluateEditorialQa(ws, issues),
  ];
  return qaReportSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    kind: "qa-report",
    caseId: ws.project.id,
    generatedAt: opts.generatedAt,
    renderPath: opts.renderPath,
    checks,
    overall: summarizeQa(checks),
  });
};
