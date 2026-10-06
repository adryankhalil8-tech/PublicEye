import type { NarrationUnit } from "../domain";

/**
 * Style checks for documentary narration. These are heuristics: they produce
 * WARNINGS for a human/agent to review, never silent rewrites.
 */

/** Stock phrases that make narration sound generated or sensational. */
export const CLICHE_PHRASES: string[] = [
  "little did they know",
  "little did he know",
  "little did she know",
  "in a world where",
  "buckle up",
  "you won't believe",
  "what happened next",
  "sent shockwaves",
  "shocked the nation",
  "a chilling reminder",
  "the rest is history",
  "stranger than fiction",
  "delve into",
  "tapestry",
  "a web of lies",
  "twists and turns",
  "nothing could have prepared",
  "one fateful",
  "fateful night",
  "unimaginable",
  "blood ran cold",
  "sinister",
  "dark secret",
  "let that sink in",
  "but here's the thing",
  "it gets worse",
];

/** Phrases that narrate a real person's inner life — unknowable without a source. */
export const INVENTED_INTERIORITY =
  /\b(thought to (?:himself|herself|themselves)|must have (?:felt|known|thought|wondered|realized)|(?:he|she|they) (?:felt|wondered|feared|realized|knew) (?:that|in)|in (?:his|her|their) mind|(?:his|her|their) heart (?:raced|pounded|sank))\b/i;

export type ScriptLintFinding = {
  unitId: string;
  code:
    | "CLICHE_PHRASE"
    | "INVENTED_INTERIORITY"
    | "QUESTION_DENSITY"
    | "CONSECUTIVE_QUESTIONS"
    | "REPEATED_OPENING"
    | "NON_FACTUAL_CONTAINS_SPECIFICS";
  message: string;
};

const isQuestion = (u: NarrationUnit) => /\?\s*$/.test(u.text.trim());

const firstWords = (text: string, n: number) =>
  text
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, n)
    .join(" ");

export const lintScriptStyle = (
  units: NarrationUnit[],
): ScriptLintFinding[] => {
  const findings: ScriptLintFinding[] = [];

  for (const u of units) {
    const lower = u.text.toLowerCase();
    for (const phrase of CLICHE_PHRASES) {
      if (lower.includes(phrase)) {
        findings.push({
          unitId: u.id,
          code: "CLICHE_PHRASE",
          message: `cliché/sensational phrase: "${phrase}"`,
        });
      }
    }
    if (INVENTED_INTERIORITY.test(u.text)) {
      findings.push({
        unitId: u.id,
        code: "INVENTED_INTERIORITY",
        message:
          "narrates a person's thoughts/feelings; only allowed if a source records them (attribute it)",
      });
    }
    if (u.framing === "NON_FACTUAL" && /\d/.test(u.text)) {
      findings.push({
        unitId: u.id,
        code: "NON_FACTUAL_CONTAINS_SPECIFICS",
        message:
          "NON_FACTUAL unit contains numbers/dates — specifics need claim links",
      });
    }
  }

  // Rhetorical questions: at most ~1 in 6 units, never back to back.
  const questions = units.filter(isQuestion).length;
  if (units.length >= 6 && questions / units.length > 1 / 6) {
    findings.push({
      unitId: units[0].id,
      code: "QUESTION_DENSITY",
      message: `${questions} of ${units.length} units end in a question — rhetorical questions are overused`,
    });
  }
  for (let i = 1; i < units.length; i++) {
    if (isQuestion(units[i]) && isQuestion(units[i - 1])) {
      findings.push({
        unitId: units[i].id,
        code: "CONSECUTIVE_QUESTIONS",
        message: "back-to-back rhetorical questions",
      });
    }
  }

  // Repetitive openings ("But…", "And then…") across adjacent units.
  for (let i = 1; i < units.length; i++) {
    const a = firstWords(units[i - 1].text, 2);
    const b = firstWords(units[i].text, 2);
    if (a && a === b) {
      findings.push({
        unitId: units[i].id,
        code: "REPEATED_OPENING",
        message: `repeats the previous unit's opening "${b}"`,
      });
    }
  }

  return findings;
};

/** Text inside straight or curly double quotes. */
export const extractQuotedSpans = (text: string): string[] =>
  [...text.matchAll(/["“]([^"”]+)["”]/g)].map((m) => m[1].trim());
