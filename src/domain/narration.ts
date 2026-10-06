import { z } from "zod";
import {
  idSchema,
  isoTimestampSchema,
  nonEmpty,
  schemaVersionSchema,
} from "./common";
import { captionSchema } from "./captions";

/**
 * Narration happens BEFORE final visual planning. The chain is:
 *
 *   ScriptDocument (approved at the SCRIPT gate)
 *     → NarrationArtifact   (audio produced + measured)
 *     → NarrationAlignment  (per-unit segments on the real audio timeline)
 *     → VisualPlan timing   (shots/beats resolved against the segments)
 *
 * Word-count estimates remain available for drafting, but are marked
 * ESTIMATED and can never time a REVIEW/FINAL manifest.
 */

export const narrationStatusSchema = z.enum([
  "PENDING",
  "GENERATED", // audio exists, not yet measured
  "MEASURED", // durations read from the actual audio
  "FAILED",
]);
export type NarrationStatus = z.infer<typeof narrationStatusSchema>;

export const narrationItemStatusSchema = z.enum([
  "PENDING",
  "COMPLETE",
  "FAILED",
]);
export type NarrationItemStatus = z.infer<typeof narrationItemStatusSchema>;

/**
 * One narration unit's audio take. Units are produced independently so a
 * script edit or a failed take re-voices only what changed.
 */
export const narrationUnitAudioSchema = z.object({
  narrationUnitId: idSchema("narration"),
  /** Fingerprint of the unit text this take was made from (staleness). */
  textFingerprint: nonEmpty,
  status: narrationItemStatusSchema,
  attemptCount: z.number().int().min(0),
  /** Relative to assets/ (the Remotion public dir). */
  audioPath: z.string().optional(),
  durationSec: z.number().min(0).optional(),
  lastError: z.string().optional(),
});
export type NarrationUnitAudio = z.infer<typeof narrationUnitAudioSchema>;

export const narrationArtifactSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("narration"),
  id: idSchema("narrationArtifact"),
  /** Fingerprint of the script the audio was made from. Mismatch = stale. */
  scriptFingerprint: nonEmpty,
  provider: z.object({
    id: nonEmpty,
    costTier: z.enum(["LOCAL", "FREE", "FREE_WITH_LIMITS", "PAID"]),
    voice: z.string().optional(),
  }),
  status: narrationStatusSchema,
  /** Full narration track, relative to assets/. */
  audioPath: z.string().optional(),
  /** Measured from the audio file — never estimated. */
  durationSec: z.number().min(0).optional(),
  sampleRate: z.number().int().positive().optional(),
  channels: z.number().int().positive().optional(),
  createdAt: isoTimestampSchema,
  measuredAt: isoTimestampSchema.optional(),
  units: z.array(narrationUnitAudioSchema),
  /**
   * True only if the SCRIPT gate was APPROVED (and fresh) when the audio was
   * produced. Draft narration is fine for timing work but can never time a
   * REVIEW/FINAL manifest.
   */
  producedFromApprovedScript: z.boolean(),
  /** Synthetic fixture narration: machine voice, never for publication. */
  isSynthetic: z.boolean().default(false),
  notes: z.string().optional(),
});
export type NarrationArtifact = z.infer<typeof narrationArtifactSchema>;

export const ALIGNMENT_SOURCES = [
  "ESTIMATED", // word-count estimate — drafting only
  "MANUAL",
  "PER_UNIT_SYNTHESIS", // exact: each unit synthesized and measured separately
  "TTS_TIMESTAMPS",
  "WHISPER",
  "WHISPER_CPP",
  "FASTER_WHISPER",
  "OTHER",
] as const;
export const alignmentSourceSchema = z.enum(ALIGNMENT_SOURCES);
export type AlignmentSource = z.infer<typeof alignmentSourceSchema>;

/** Sources that reflect real audio. ESTIMATED is the only non-measured one. */
export const isMeasuredAlignment = (source: AlignmentSource) =>
  source !== "ESTIMATED";

/** Where one narration unit sits on the narration audio timeline. */
export const narrationSegmentSchema = z.object({
  id: idSchema("segment"),
  narrationUnitId: idSchema("narration"),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  durationSec: z.number().min(0),
  /** Text as spoken. Must match the script unit (verified text is not re-transcribed). */
  text: nonEmpty,
  confidence: z.number().min(0).max(1).optional(),
  alignmentSource: alignmentSourceSchema.optional(),
});
export type NarrationSegment = z.infer<typeof narrationSegmentSchema>;

export const narrationAlignmentSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("narration-alignment"),
  narrationId: idSchema("narrationArtifact"),
  alignmentSource: alignmentSourceSchema,
  tool: z.string().optional(),
  createdAt: isoTimestampSchema,
  /** Total audio length the segments were aligned against. */
  audioDurationSec: z.number().min(0),
  /** One segment per narration unit, in playback order. */
  segments: z.array(narrationSegmentSchema).min(1),
  /** Optional word-level timings (Remotion Caption shape) for captions. */
  words: z.array(captionSchema).default([]),
});
export type NarrationAlignment = z.infer<typeof narrationAlignmentSchema>;
