import { z } from "zod";
import { idSchema, isoTimestampSchema, schemaVersionSchema } from "./common";
import { rightsStatusSchema } from "./sources";
import { alignmentSourceSchema } from "./narration";
import {
  representationSchema,
  shotTypeSchema,
  visualStateSchema,
} from "./visual";

export const RENDER_DEFAULTS = { width: 1920, height: 1080, fps: 30 } as const;

export const qcStatusSchema = z.enum(["PENDING", "PASSED", "FAILED"]);

/**
 * The hand-off from planning to rendering: fully resolved timing (from
 * measured narration when it exists), visual-state timing, the narration
 * track, the visual-bible revision, the assets a render may touch, and a QC
 * summary. The renderer executes this; it decides nothing editorial.
 *
 * `qc` mirrors output/qa-report.json and the run's gates for convenience;
 * those artifacts are canonical and validation cross-checks them.
 */
export const productionManifestSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("production-manifest"),
  caseId: idSchema("case"),
  isSynthetic: z.boolean(),
  stage: z.enum(["DRAFT", "REVIEW", "FINAL"]),
  generatedAt: isoTimestampSchema,
  render: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().int().positive(),
    durationInFrames: z.number().int().positive(),
  }),
  timingSource: z.enum(["ESTIMATED", "AUDIO"]),
  alignmentSource: alignmentSourceSchema.optional(),
  /** Narration track to play under the video (relative to assets/). */
  narration: z
    .object({
      narrationId: idSchema("narrationArtifact"),
      audioPath: z.string(),
      durationSec: z.number().min(0),
    })
    .optional(),
  visualBibleRevision: z.number().int().positive().optional(),
  /** Fingerprints of the inputs this manifest was built from (staleness). */
  inputs: z
    .object({
      script: z.string(),
      visualPlan: z.string(),
      alignment: z.string().optional(),
      visualBible: z.string().optional(),
    })
    .optional(),
  shots: z.array(
    z.object({
      shotId: idSchema("shot"),
      sequenceId: idSchema("sequence"),
      shotType: shotTypeSchema,
      representation: representationSchema,
      startFrame: z.number().int().min(0),
      durationInFrames: z.number().int().positive(),
      narrationIds: z.array(idSchema("narration")),
      assetIds: z.array(idSchema("asset")),
      /** Visual states resolved to frames, relative to the shot start. */
      states: z
        .array(
          z.object({
            beatId: idSchema("sceneBeat"),
            state: visualStateSchema.optional(),
            target: z.string().optional(),
            atFrame: z.number().int().min(0),
          }),
        )
        .default([]),
    }),
  ),
  assets: z.array(
    z.object({
      assetId: idSchema("asset"),
      localPath: z.string(),
      rightsStatus: rightsStatusSchema,
      approved: z.boolean(),
      creditText: z.string().optional(),
    }),
  ),
  credits: z.array(z.string()),
  qc: z.object({
    factQc: qcStatusSchema,
    visualQc: qcStatusSchema,
    humanApproval: z.object({
      status: qcStatusSchema,
      approvedBy: z.string().optional(),
      approvedAt: isoTimestampSchema.optional(),
    }),
  }),
  validation: z.object({
    errors: z.number().int().min(0),
    warnings: z.number().int().min(0),
  }),
});
export type ProductionManifest = z.infer<typeof productionManifestSchema>;
