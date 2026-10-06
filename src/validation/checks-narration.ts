import { DEFAULT_NEGATIVE_CONSTRAINTS, isMeasuredAlignment } from "../domain";
import { fingerprint } from "../pipeline/fingerprint";
import { at, type ValidationContext } from "./context";

const EPS = 0.011;
const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Narration comes from the approved script and is measured, not estimated.
 * Any script edit after narration makes the audio stale.
 */
export const checkNarration = (ctx: ValidationContext) => {
  const n = ctx.ws.narration;
  if (!n) return;
  const script = ctx.ws.script;
  const path = at("narration");
  if (!script) {
    ctx.c.error("MISSING_UPSTREAM", path, "narration requires script.json");
    return;
  }
  if (n.scriptFingerprint !== fingerprint(script)) {
    ctx.c.error(
      "NARRATION_STALE",
      path,
      "script changed after narration was produced — re-voice the changed units",
    );
  }
  const byUnit = new Map(n.units.map((u) => [u.narrationUnitId, u]));
  for (const unit of script.units) {
    const take = byUnit.get(unit.id);
    if (!take) {
      ctx.c[n.status === "MEASURED" ? "error" : "warn"](
        "NARRATION_UNIT_MISSING",
        `${path}#${unit.id}`,
        "no audio take for this script unit",
      );
      continue;
    }
    if (take.textFingerprint !== fingerprint(unit.text)) {
      ctx.c.error(
        "NARRATION_UNIT_STALE",
        `${path}#${unit.id}`,
        "unit text changed since this take was recorded",
      );
    }
    if (take.status === "FAILED" && !take.lastError) {
      ctx.c.warn(
        "NARRATION_FAILURE_UNEXPLAINED",
        `${path}#${unit.id}`,
        "FAILED take should record lastError",
      );
    }
  }
  for (const take of n.units) {
    if (!ctx.narration.has(take.narrationUnitId)) {
      ctx.c.error(
        "BROKEN_NARRATION_REF",
        `${path}#${take.narrationUnitId}`,
        "take refers to a unit not in the script",
      );
    }
  }
  if (n.status === "MEASURED") {
    if (!n.audioPath || n.durationSec === undefined || !n.measuredAt) {
      ctx.c.error(
        "NARRATION_NOT_MEASURED",
        path,
        "MEASURED narration needs audioPath, durationSec, and measuredAt",
      );
    }
    if (n.units.some((u) => u.status !== "COMPLETE")) {
      ctx.c.error(
        "NARRATION_INCOMPLETE",
        path,
        "MEASURED narration has takes that are not COMPLETE",
      );
    }
  }
  if (n.provider.costTier === "PAID") {
    ctx.c.warn(
      "PAID_PROVIDER_USED",
      path,
      "paid narration provider — confirm a human-approved cost approval exists in the run",
    );
  }
  if (n.isSynthetic && !ctx.ws.project.isSynthetic) {
    ctx.c.error(
      "SYNTHETIC_NARRATION_IN_REAL_CASE",
      path,
      "fixture/machine narration marked synthetic is not publishable",
    );
  }
};

/** Segments must cover the script, in order, on the measured timeline. */
export const checkAlignment = (ctx: ValidationContext) => {
  const a = ctx.ws.alignment;
  if (!a) return;
  const path = at("alignment");
  const script = ctx.ws.script;
  if (!script) {
    ctx.c.error("MISSING_UPSTREAM", path, "alignment requires script.json");
    return;
  }
  if (!isMeasuredAlignment(a.alignmentSource)) {
    ctx.c.info(
      "ALIGNMENT_ESTIMATED",
      path,
      "alignment is a word-count estimate — drafting only",
    );
  } else {
    const n = ctx.ws.narration;
    if (!n)
      ctx.c.error(
        "MISSING_UPSTREAM",
        path,
        "measured alignment requires narration/narration.json",
      );
    else {
      if (a.narrationId !== n.id)
        ctx.c.error(
          "ALIGNMENT_NARRATION_MISMATCH",
          path,
          `aligned to ${a.narrationId}, narration is ${n.id}`,
        );
      if (
        n.durationSec !== undefined &&
        Math.abs(n.durationSec - a.audioDurationSec) > 0.05
      ) {
        ctx.c.error(
          "ALIGNMENT_DURATION_MISMATCH",
          path,
          `alignment says ${a.audioDurationSec}s, measured audio is ${n.durationSec}s`,
        );
      }
    }
  }

  const units = script.units;
  if (a.segments.length !== units.length) {
    ctx.c.error(
      "ALIGNMENT_UNIT_COUNT",
      path,
      `${a.segments.length} segments for ${units.length} script units`,
    );
  }
  let prevEnd = 0;
  a.segments.forEach((seg, i) => {
    const p = `${path}#${seg.id}`;
    if (units[i] && seg.narrationUnitId !== units[i].id) {
      ctx.c.error(
        "ALIGNMENT_UNIT_ORDER",
        p,
        `segment ${i + 1} is ${seg.narrationUnitId}, script unit ${i + 1} is ${units[i].id}`,
      );
    }
    if (!ctx.narration.has(seg.narrationUnitId))
      ctx.c.error(
        "BROKEN_NARRATION_REF",
        p,
        `unknown unit ${seg.narrationUnitId}`,
      );
    if (seg.endSec <= seg.startSec)
      ctx.c.error("SEGMENT_INVALID", p, "endSec must be after startSec");
    if (Math.abs(seg.endSec - seg.startSec - seg.durationSec) > EPS)
      ctx.c.error("SEGMENT_INVALID", p, "durationSec ≠ endSec − startSec");
    if (seg.startSec + EPS < prevEnd)
      ctx.c.error(
        "SEGMENT_OVERLAP",
        p,
        "segment starts before the previous one ends",
      );
    if (seg.endSec > a.audioDurationSec + EPS)
      ctx.c.error(
        "SEGMENT_BEYOND_AUDIO",
        p,
        "segment ends after the audio does",
      );
    const unit = ctx.narration.get(seg.narrationUnitId);
    if (unit && normalize(unit.text) !== normalize(seg.text)) {
      ctx.c.error(
        "ALIGNMENT_TEXT_MISMATCH",
        p,
        "segment text differs from the verified script text",
      );
    }
    prevEnd = seg.endSec;
  });
  for (let i = 1; i < a.words.length; i++) {
    if (a.words[i].startMs < a.words[i - 1].startMs) {
      ctx.c.error(
        "WORD_TIMING_ORDER",
        path,
        `word ${i} starts before word ${i - 1}`,
      );
      break;
    }
  }
};

export const checkVisualBible = (ctx: ValidationContext) => {
  const b = ctx.ws.visualBible;
  const plan = ctx.ws.visualPlan;
  if (b) {
    const path = at("visualBible");
    if (b.projectId !== ctx.ws.project.id)
      ctx.c.error(
        "VISUAL_BIBLE_CASE_MISMATCH",
        path,
        `bible is for ${b.projectId}`,
      );
    const lower = b.negativeConstraints.map((c) => c.toLowerCase()).join(" | ");
    const dropped = DEFAULT_NEGATIVE_CONSTRAINTS.filter(
      (c) => !lower.includes(c.toLowerCase()),
    );
    if (dropped.length) {
      ctx.c.warn(
        "NEGATIVE_CONSTRAINT_DROPPED",
        path,
        `default constraints not carried over: ${dropped.join("; ")}`,
      );
    }
    for (const ref of b.approvedReferences) {
      if (
        ref.usage === "USABLE_IN_VIDEO" &&
        !["PUBLIC_DOMAIN", "LICENSED", "OWNED"].includes(ref.rightsStatus)
      ) {
        ctx.c.error(
          "REFERENCE_RIGHTS",
          path,
          `"${ref.description}" is marked usable in video with rights ${ref.rightsStatus}`,
        );
      }
    }
  }
  if (plan && b) {
    if (plan.visualBibleRevision === undefined) {
      ctx.c.warn(
        "VISUAL_PLAN_BIBLE_UNSET",
        at("visualPlan"),
        "visual plan does not record which bible revision it follows",
      );
    } else if (plan.visualBibleRevision !== b.revision) {
      ctx.c.error(
        "VISUAL_PLAN_STALE_BIBLE",
        at("visualPlan"),
        `planned against bible rev ${plan.visualBibleRevision}, current is rev ${b.revision}`,
      );
    }
  }
};
