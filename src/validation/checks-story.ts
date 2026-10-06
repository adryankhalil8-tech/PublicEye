import type { CaseClaim, ClaimStatus, NarrationFraming } from "../domain";
import {
  ATTRIBUTION_MARKERS,
  GUILT_LABELS,
  LEGAL_TERM_RULES,
  legalStatusesBackedBy,
} from "../research/legal-language";
import { estimateScriptDurationSec } from "../storytelling/duration";
import {
  extractQuotedSpans,
  lintScriptStyle,
} from "../storytelling/script-lint";
import { at, checkRefs, type ValidationContext } from "./context";

export const checkStory = (ctx: ValidationContext) => {
  const story = ctx.ws.story;
  if (!story) return;
  const angle = story.angle;

  checkRefs(
    ctx,
    angle.requiredClaimIds,
    ctx.claims,
    "claim",
    at("story", angle.id),
  );
  for (const id of angle.requiredClaimIds) {
    const status = ctx.claims.get(id)?.status;
    if (status === "CONTRADICTED") {
      ctx.c.error(
        "ANGLE_DEPENDS_ON_CONTRADICTED",
        at("story", angle.id),
        `angle requires contradicted claim "${id}"`,
      );
    } else if (status && status !== "SUPPORTED") {
      ctx.c.warn(
        "ANGLE_DEPENDS_ON_UNSUPPORTED",
        at("story", angle.id),
        `angle requires ${status} claim "${id}"`,
      );
    }
  }

  checkRefs(ctx, story.hook.claimIds, ctx.claims, "claim", at("story", "hook"));
  for (const id of story.hook.claimIds) {
    const status = ctx.claims.get(id)?.status;
    if (status === "UNVERIFIED" || status === "CONTRADICTED") {
      ctx.c.error(
        "HOOK_UNSUPPORTED",
        at("story", "hook"),
        `hook relies on ${status} claim "${id}"`,
      );
    }
  }

  const order = new Map(story.sequences.map((s, i) => [s.id, i]));
  for (const seq of story.sequences) {
    if (!story.narrativeArc.includes(seq.section)) {
      ctx.c.warn(
        "SECTION_NOT_IN_ARC",
        at("story", seq.id),
        `section ${seq.section} is not in narrativeArc`,
      );
    }
    for (const b of seq.beats) {
      checkRefs(
        ctx,
        b.claimIds,
        ctx.claims,
        "claim",
        at("story", `${seq.id}/${b.id}`),
      );
      checkRefs(
        ctx,
        b.eventIds,
        ctx.events,
        "event",
        at("story", `${seq.id}/${b.id}`),
      );
    }
  }

  for (const r of story.reveals) {
    const path = at("story", r.id);
    checkRefs(ctx, r.claimIds, ctx.claims, "claim", path);
    checkRefs(
      ctx,
      [r.setupSequenceId, r.payoffSequenceId],
      ctx.sequences,
      "sequence",
      path,
    );
    const s = order.get(r.setupSequenceId);
    const p = order.get(r.payoffSequenceId);
    if (s !== undefined && p !== undefined && s >= p) {
      ctx.c.error(
        "REVEAL_ORDER",
        path,
        "reveal payoff must come after its setup",
      );
    }
    for (const id of r.claimIds) {
      const status = ctx.claims.get(id)?.status;
      if (status && status !== "SUPPORTED" && status !== "DISPUTED") {
        ctx.c.error(
          "REVEAL_UNSUPPORTED",
          path,
          `reveal delivers ${status} claim "${id}" as a payoff`,
        );
      }
    }
  }

  checkRefs(
    ctx,
    story.emotionalProgression.map((e) => e.sequenceId),
    ctx.sequences,
    "sequence",
    at("story", "emotionalProgression"),
  );
  checkRefs(
    ctx,
    story.endingStrategy.claimIds,
    ctx.claims,
    "claim",
    at("story", "endingStrategy"),
  );

  const planned = story.sequences.reduce(
    (sum, s) => sum + s.targetDurationSec,
    0,
  );
  const target = story.pacing.targetTotalSec;
  if (Math.abs(planned - target) / target > 0.1) {
    ctx.c.warn(
      "PACING_MISMATCH",
      at("story", "pacing"),
      `sequences plan ${planned}s against a ${target}s target`,
    );
  }
};

/** Claim statuses each framing may reference. UNVERIFIED is never allowed. */
const FRAMING_ALLOWS: Record<NarrationFraming, ClaimStatus[]> = {
  STATED: ["SUPPORTED"],
  ATTRIBUTED: ["SUPPORTED"],
  UNCERTAIN: ["SUPPORTED", "INSUFFICIENT_EVIDENCE", "DISPUTED"],
  DISPUTED: ["SUPPORTED", "DISPUTED", "INSUFFICIENT_EVIDENCE"],
  CORRECTION: ["SUPPORTED", "CONTRADICTED"],
  NON_FACTUAL: [],
};

const normalizeQuote = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/, "")
    .trim()
    .toLowerCase();

export const checkScript = (ctx: ValidationContext) => {
  const script = ctx.ws.script;
  if (!script) return;
  if (!ctx.ws.story) {
    ctx.c.error(
      "MISSING_UPSTREAM",
      at("script"),
      "a script requires story-plan.json",
    );
    return;
  }

  const covered = new Set<string>();
  for (const unit of script.units) {
    const path = at("script", unit.id);
    checkRefs(ctx, [unit.sequenceId], ctx.sequences, "sequence", path);
    checkRefs(ctx, unit.claimIds, ctx.claims, "claim", path);
    covered.add(unit.sequenceId);

    const claims = unit.claimIds
      .map((id) => ctx.claims.get(id))
      .filter((c): c is CaseClaim => !!c);

    if (unit.framing === "NON_FACTUAL") {
      if (unit.claimIds.length)
        ctx.c.error(
          "NON_FACTUAL_WITH_CLAIMS",
          path,
          "NON_FACTUAL units must not cite claims — choose a factual framing",
        );
    } else if (unit.claimIds.length === 0) {
      ctx.c.error(
        "UNSOURCED_NARRATION",
        path,
        `${unit.framing} narration must cite at least one claim`,
      );
    }

    for (const claim of claims) {
      if (claim.status === "UNVERIFIED") {
        ctx.c.error(
          "SCRIPT_USES_UNVERIFIED_CLAIM",
          path,
          `cites UNVERIFIED claim "${claim.id}"`,
        );
      } else if (!FRAMING_ALLOWS[unit.framing].includes(claim.status)) {
        ctx.c.error(
          "SCRIPT_FRAMING_MISMATCH",
          path,
          `${unit.framing} framing cannot present ${claim.status} claim "${claim.id}" (allowed: ${FRAMING_ALLOWS[unit.framing].join(", ") || "none"})`,
        );
      }
    }

    // "Police alleged X" must not become "X".
    const hasAttributed = claims.some((c) => c.assertion.type === "ATTRIBUTED");
    if (
      (hasAttributed || unit.framing === "ATTRIBUTED") &&
      !ATTRIBUTION_MARKERS.test(unit.text)
    ) {
      ctx.c.error(
        "ATTRIBUTION_DROPPED",
        path,
        "cites an attributed claim but the narration does not say who asserted it",
      );
    }

    // Legal-outcome words need a matching SUPPORTED legal-status claim.
    const backed = legalStatusesBackedBy(claims);
    for (const rule of LEGAL_TERM_RULES) {
      if (
        rule.pattern.test(unit.text) &&
        !rule.requires.some((s) => backed.has(s))
      ) {
        const msg = `mentions ${rule.label} without a SUPPORTED LEGAL_STATUS claim (${rule.requires.join("/")}) in this unit`;
        if (rule.severity === "ERROR")
          ctx.c.error("LEGAL_TERM_UNSUPPORTED", path, msg);
        else ctx.c.warn("LEGAL_TERM_UNSUPPORTED", path, msg);
      }
    }
    if (GUILT_LABELS.test(unit.text)) {
      ctx.c.warn(
        "GUILT_LABEL",
        path,
        "uses a guilt-presuming label — review against the legal record",
      );
    }

    // Quotation marks mean verbatim words from a verified QUOTE claim.
    const quoteTexts = claims
      .filter((c) => c.status === "SUPPORTED" && c.assertion.type === "QUOTE")
      .map((c) =>
        c.assertion.type === "QUOTE"
          ? normalizeQuote(c.assertion.quoteText)
          : "",
      );
    for (const span of extractQuotedSpans(unit.text)) {
      if (!quoteTexts.some((q) => q.includes(normalizeQuote(span)))) {
        ctx.c.error(
          "UNSOURCED_QUOTE",
          path,
          `quoted text "${span}" does not match a SUPPORTED QUOTE claim in this unit`,
        );
      }
    }
  }

  for (const f of lintScriptStyle(script.units)) {
    ctx.c.warn(`STYLE_${f.code}`, at("script", f.unitId), f.message);
  }

  for (const seq of ctx.ws.story.sequences) {
    if (!covered.has(seq.id))
      ctx.c.warn(
        "SEQUENCE_WITHOUT_NARRATION",
        at("story", seq.id),
        "no narration units for this sequence",
      );
  }

  const estimate = estimateScriptDurationSec(script);
  const target = ctx.ws.project.targetDurationSec;
  ctx.c.info(
    "SCRIPT_DURATION_ESTIMATE",
    at("script"),
    `estimated narration ≈ ${estimate}s at ${script.wordsPerMinute} wpm (target ${target}s)`,
  );
  if (Math.abs(estimate - target) / target > 0.2) {
    ctx.c.warn(
      "SCRIPT_DURATION_OFF_TARGET",
      at("script"),
      `estimate ${estimate}s is more than 20% off the ${target}s target`,
    );
  }
};
