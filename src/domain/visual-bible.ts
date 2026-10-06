import { z } from "zod";
import {
  idSchema,
  isoTimestampSchema,
  nonEmpty,
  schemaVersionSchema,
} from "./common";
import { rightsStatusSchema } from "./sources";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be #RRGGBB");

/**
 * The case's locked visual anchors, approved before shot planning and asset
 * acquisition — so dozens of assets and shots share one identity instead of
 * drifting shot by shot. Revisions are explicit: a visual plan records the
 * revision it was planned against, and goes stale if the bible changes.
 */
export const caseVisualBibleSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("visual-bible"),
  styleId: idSchema("visualBible"),
  projectId: idSchema("case"),
  revision: z.number().int().positive(),
  updatedAt: isoTimestampSchema,
  visualTone: z.array(nonEmpty).min(1),
  /** Named tokens the renderer maps onto its theme. */
  palette: z.object({
    ground: hexColor,
    groundRaised: hexColor,
    text: hexColor,
    textMuted: hexColor,
    rule: hexColor,
    paper: hexColor,
    paperInk: hexColor,
    highlight: hexColor,
    strike: hexColor,
    label: hexColor,
  }),
  typography: z.object({
    titles: nonEmpty,
    body: nonEmpty,
    records: nonEmpty,
    /** Bundled local font files, relative to assets/. Empty = system fonts. */
    localFontFiles: z.array(z.string()).default([]),
  }),
  compositionRules: z.array(nonEmpty).min(1),
  archivalTreatment: nonEmpty,
  documentTreatment: nonEmpty,
  mapTreatment: nonEmpty,
  timelineTreatment: nonEmpty,
  reconstructionTreatment: z.object({
    /** Must stay true: generated/illustrative media is always labeled. */
    alwaysLabeled: z.literal(true),
    description: nonEmpty,
  }),
  cameraRules: z.array(nonEmpty).min(1),
  transitionRules: z.array(nonEmpty).min(1),
  textureRules: z.array(nonEmpty).default([]),
  /** Things this case must never look like. */
  negativeConstraints: z.array(nonEmpty).min(1),
  approvedReferences: z
    .array(
      z.object({
        description: nonEmpty,
        url: z.url().optional(),
        localPath: z.string().optional(),
        /** References are for look only; still record their rights. */
        rightsStatus: rightsStatusSchema,
        usage: z.enum(["LOOK_REFERENCE_ONLY", "USABLE_IN_VIDEO"]),
      }),
    )
    .default([]),
});
export type CaseVisualBible = z.infer<typeof caseVisualBibleSchema>;

/**
 * Default negative constraints for this channel. Validation warns if a bible
 * drops any of them without replacing it.
 */
export const DEFAULT_NEGATIVE_CONSTRAINTS = [
  "No generic police lights or red/blue flashing",
  "No crime-scene tape as decoration",
  "No blood splatter or gore imagery",
  "No fingerprint or magnifying-glass clichés",
  "No generic dark alleys",
  "No neon grids, floating glass cards, or random particles",
  "No fake newspaper headlines or fake evidence documents",
  "No centered text in every scene",
] as const;
