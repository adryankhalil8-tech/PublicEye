import type { NarrationUnit, ScriptDocument } from "../domain";

/**
 * Narration duration estimate used before real audio exists. Deliberately
 * simple and documented — replaced by measured audio length in Phase 3.
 *
 *   seconds = spokenWords / wpm * 60
 *           + 0.35s per sentence end + 0.15s per comma/dash/semicolon
 *           + pauseAfterSec
 *
 * Numerals are expanded to an approximate spoken word count ("1952" is
 * "nineteen fifty-two": ~3 words).
 */
export const SENTENCE_PAUSE_SEC = 0.35;
export const CLAUSE_PAUSE_SEC = 0.15;

export const spokenWordCount = (text: string): number => {
  let count = 0;
  for (const token of text.split(/\s+/).filter(Boolean)) {
    const digits = token.replace(/[^\d]/g, "");
    if (digits.length === 0) count += 1;
    else if (/^(1[0-9]|20)\d\d$/.test(digits))
      count += 3; // a year
    else count += Math.max(1, Math.ceil(digits.length / 1.5));
  }
  return count;
};

export const estimateUnitDurationSec = (
  unit: NarrationUnit,
  wordsPerMinute: number,
): number => {
  const words = spokenWordCount(unit.text);
  const sentences = (unit.text.match(/[.!?]+(\s|$)/g) ?? []).length;
  const clauses = (unit.text.match(/[,;:—–]/g) ?? []).length;
  const seconds =
    (words / wordsPerMinute) * 60 +
    sentences * SENTENCE_PAUSE_SEC +
    clauses * CLAUSE_PAUSE_SEC +
    unit.pauseAfterSec;
  return Math.round(seconds * 100) / 100;
};

export const estimateScriptDurationSec = (script: ScriptDocument): number =>
  Math.round(
    script.units.reduce(
      (sum, u) => sum + estimateUnitDurationSec(u, script.wordsPerMinute),
      0,
    ) * 10,
  ) / 10;

/** Recommended bounds for this channel format. */
export const TARGET_DURATION_RANGE_SEC = { min: 300, max: 600 } as const;
