import { z } from "zod";

/**
 * Every persisted artifact carries `schemaVersion`. Bump this (and add a
 * migration in docs/ARCHITECTURE.md#schema-versioning) whenever a persisted
 * shape changes incompatibly. Parsers reject any other version.
 */
export const SCHEMA_VERSION = 1 as const;
export const schemaVersionSchema = z.literal(SCHEMA_VERSION);

/**
 * ID prefixes make cross-references self-describing in hand-edited JSON:
 * a claim ID in a `sourceIds` array is visibly wrong.
 */
export const ID_PREFIXES = {
  case: "case",
  candidate: "cand",
  source: "src",
  claim: "clm",
  evidence: "evd",
  person: "per",
  organization: "org",
  location: "loc",
  event: "evt",
  question: "q",
  contradiction: "ctr",
  angle: "ang",
  sequence: "seq",
  storyBeat: "sb",
  reveal: "rev",
  narration: "nu",
  shot: "shot",
  sceneBeat: "beat",
  assetRequirement: "req",
  asset: "ast",
  gap: "gap",
  narrationArtifact: "narr",
  segment: "seg",
  visualBible: "vb",
  run: "run",
  gate: "gate",
  costApproval: "cost",
  qaCheck: "qa",
} as const;

export type IdKind = keyof typeof ID_PREFIXES;

const ID_BODY = "[a-z0-9]+(?:-[a-z0-9]+)*";

export const idSchema = <K extends IdKind>(kind: K) =>
  z
    .string()
    .regex(
      new RegExp(`^${ID_PREFIXES[kind]}-${ID_BODY}$`),
      `must look like "${ID_PREFIXES[kind]}-<kebab-case>"`,
    );

/** ISO-8601 calendar date (YYYY-MM-DD) or full timestamp with offset. */
export const isoTimestampSchema = z.union([
  z.iso.date(),
  z.iso.datetime({ offset: true }),
]);

/**
 * A calendar date known only to a given granularity: "1931", "1931-10",
 * or "1931-10-17". Precision is carried by the string itself so the system
 * never has to invent a day or month that the sources do not give.
 */
export const partialDateSchema = z
  .string()
  .regex(
    /^\d{4}(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?$/,
    "must be YYYY, YYYY-MM, or YYYY-MM-DD",
  );
export type PartialDate = z.infer<typeof partialDateSchema>;

export const confidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type Confidence = z.infer<typeof confidenceSchema>;

export const nonEmpty = z.string().trim().min(1);
