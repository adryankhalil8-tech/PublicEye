import { z } from "zod";
import { idSchema, nonEmpty, schemaVersionSchema } from "./common";

/**
 * How a narration unit presents its claims. Validation checks framing against
 * the referenced claims' verification status:
 *
 * - STATED: plain assertion. Every claim must be SUPPORTED.
 * - ATTRIBUTED: "prosecutors alleged…". Claims must be SUPPORTED as attributions.
 * - UNCERTAIN: "it is not clear whether…". May use INSUFFICIENT_EVIDENCE claims.
 * - DISPUTED: presents competing accounts. May use DISPUTED claims.
 * - CORRECTION: debunks a myth. The only framing allowed to use CONTRADICTED claims.
 * - NON_FACTUAL: connective narration with no factual content; no claims.
 *
 * UNVERIFIED claims are never allowed in a script.
 */
export const narrationFramingSchema = z.enum([
  "STATED",
  "ATTRIBUTED",
  "UNCERTAIN",
  "DISPUTED",
  "CORRECTION",
  "NON_FACTUAL",
]);
export type NarrationFraming = z.infer<typeof narrationFramingSchema>;

export const narrationUnitSchema = z.object({
  id: idSchema("narration"),
  sequenceId: idSchema("sequence"),
  text: nonEmpty,
  framing: narrationFramingSchema,
  claimIds: z.array(idSchema("claim")).default([]),
  deliveryNotes: z.string().optional(),
  /** Deliberate silence after this unit, for pacing. */
  pauseAfterSec: z.number().min(0).max(10).default(0),
});
export type NarrationUnit = z.infer<typeof narrationUnitSchema>;

export const scriptDocumentSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("script"),
  title: nonEmpty,
  status: z.enum(["DRAFT", "FACT_CHECKED", "LOCKED"]),
  /** Narration pace used for duration estimates before real audio exists. */
  wordsPerMinute: z.number().min(90).max(220).default(150),
  /** Units in playback order. */
  units: z.array(narrationUnitSchema).min(1),
  notes: z.string().optional(),
});
export type ScriptDocument = z.infer<typeof scriptDocumentSchema>;
