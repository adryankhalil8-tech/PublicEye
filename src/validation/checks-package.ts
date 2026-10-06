import type { CaseClaim } from "../domain";
import {
  buildChapters,
  buildCredits,
  chapterProblems,
} from "../production/package";
import { summarizeQa } from "../qa";
import {
  GUILT_LABELS,
  LEGAL_TERM_RULES,
  legalStatusesBackedBy,
} from "../research/legal-language";
import { CLICHE_PHRASES } from "../storytelling/script-lint";
import { at, checkRefs, type ValidationContext } from "./context";

/** Clickbait on top of the script clichés; metadata must not oversell. */
const CLICKBAIT =
  /\b(shocking|you won'?t believe|insane|gone wrong|exposed|the truth about|what really happened)\b/i;

/**
 * YouTube metadata obeys the same factual rules as narration: claims cited,
 * legal words backed, no guilt labels, no claim stronger than the video.
 */
export const checkYouTubePackage = (ctx: ValidationContext) => {
  const p = ctx.ws.youtubePackage;
  if (!p) return;
  const path = at("youtubePackage");
  if (p.caseId !== ctx.ws.project.id)
    ctx.c.error("PACKAGE_CASE_MISMATCH", path, `package is for ${p.caseId}`);

  const texts = [
    ...p.titleCandidates.map((t, i) => ({
      where: `title ${i + 1}`,
      text: t.text,
      claimIds: t.claimIds,
    })),
    {
      where: "description",
      text: p.description.text,
      claimIds: p.description.claimIds,
    },
    {
      where: "thumbnail text",
      text: p.thumbnailBrief.textOverlay ?? "",
      claimIds: [] as string[],
    },
  ];
  for (const t of texts) {
    checkRefs(ctx, t.claimIds, ctx.claims, "claim", `${path}#${t.where}`);
    const claims = t.claimIds
      .map((id) => ctx.claims.get(id))
      .filter((c): c is CaseClaim => !!c);
    for (const c of claims) {
      if (c.status !== "SUPPORTED") {
        ctx.c.error(
          "PACKAGE_UNSUPPORTED_CLAIM",
          `${path}#${t.where}`,
          `cites ${c.status} claim "${c.id}"`,
        );
      }
    }
    const backed = legalStatusesBackedBy(claims);
    for (const rule of LEGAL_TERM_RULES) {
      if (
        rule.pattern.test(t.text) &&
        !rule.requires.some((s) => backed.has(s))
      ) {
        ctx.c.error(
          "PACKAGE_LEGAL_TERM_UNSUPPORTED",
          `${path}#${t.where}`,
          `mentions ${rule.label} without a cited SUPPORTED legal-status claim`,
        );
      }
    }
    if (GUILT_LABELS.test(t.text)) {
      ctx.c.error(
        "PACKAGE_GUILT_LABEL",
        `${path}#${t.where}`,
        "guilt-presuming label in publishing metadata",
      );
    }
    const lower = t.text.toLowerCase();
    if (
      CLICKBAIT.test(t.text) ||
      CLICHE_PHRASES.some((c) => lower.includes(c))
    ) {
      ctx.c.warn(
        "PACKAGE_CLICKBAIT",
        `${path}#${t.where}`,
        "sensational phrasing — accuracy outranks clickability",
      );
    }
  }

  const m = ctx.ws.manifest;
  if (m) {
    const totalSec = m.render.durationInFrames / m.render.fps;
    for (const problem of chapterProblems(p.chapters, totalSec)) {
      ctx.c.error("PACKAGE_CHAPTERS_INVALID", `${path}#chapters`, problem);
    }
    if (ctx.ws.story) {
      const expected = buildChapters(ctx.ws.story, m);
      const same =
        expected.length === p.chapters.length &&
        expected.every(
          (c, i) => Math.abs(c.startSec - p.chapters[i].startSec) < 1,
        );
      if (!same)
        ctx.c.warn(
          "PACKAGE_CHAPTERS_STALE",
          `${path}#chapters`,
          "chapters differ from the current timed manifest",
        );
    }
  }

  const { credits } = buildCredits(ctx.ws);
  for (const credit of credits) {
    if (!p.credits.includes(credit))
      ctx.c.error(
        "PACKAGE_CREDIT_MISSING",
        `${path}#credits`,
        `missing required credit: ${credit}`,
      );
  }
  checkRefs(
    ctx,
    p.sourceNotes.map((s) => s.sourceId),
    ctx.sources,
    "source",
    `${path}#sourceNotes`,
  );
  if (
    ctx.ws.project.isSynthetic &&
    !/synthetic|fictional/i.test(p.description.text)
  ) {
    ctx.c.error(
      "PACKAGE_SYNTHETIC_UNMARKED",
      `${path}#description`,
      "a synthetic case's description must say it is fictional",
    );
  }
};

/** A QA report may not claim more than its checks show. */
export const checkQaReport = (ctx: ValidationContext) => {
  const r = ctx.ws.qaReport;
  if (!r) return;
  const path = at("qaReport");
  if (r.caseId !== ctx.ws.project.id)
    ctx.c.error("QA_CASE_MISMATCH", path, `report is for ${r.caseId}`);
  const computed = summarizeQa(r.checks);
  if (r.overall !== computed) {
    ctx.c.error(
      "QA_OVERALL_INCONSISTENT",
      path,
      `overall is ${r.overall} but the checks compute to ${computed}`,
    );
  }
  for (const c of r.checks) {
    if (c.reviewedBy && !/^human:\S/.test(c.reviewedBy)) {
      ctx.c.error(
        "QA_REVIEW_NOT_HUMAN",
        `${path}#${c.id}`,
        `manual checks are resolved by humans, got "${c.reviewedBy}"`,
      );
    }
    if (c.status === "MANUAL_REQUIRED" && c.automated) {
      ctx.c.warn(
        "QA_CHECK_INCONSISTENT",
        `${path}#${c.id}`,
        "automated check left as MANUAL_REQUIRED",
      );
    }
  }
};
