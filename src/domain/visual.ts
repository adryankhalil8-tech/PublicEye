import { z } from "zod";
import { idSchema, nonEmpty, schemaVersionSchema } from "./common";
import { assetRequirementSchema } from "./assets";

/**
 * Renderer-independent visual vocabulary. The visual director picks a
 * *strategy and intent*; the Remotion layer decides which component draws it.
 */
export const SHOT_TYPES = [
  "ARCHIVAL_PHOTO",
  "COURT_DOCUMENT",
  "NEWSPAPER",
  "MAP",
  "TIMELINE",
  "EVIDENCE_DIAGRAM",
  "LOCATION",
  "PORTRAIT",
  "DOCUMENT_HIGHLIGHT",
  "QUOTE",
  "DATE_CARD",
  "DATA_VISUALIZATION",
  "RECONSTRUCTION",
  "ATMOSPHERIC_BROLL",
  "TYPOGRAPHY",
] as const;
export const shotTypeSchema = z.enum(SHOT_TYPES);
export type ShotType = z.infer<typeof shotTypeSchema>;

/**
 * Anything that is not an authentic record must be labeled on screen.
 * The label text is fixed per kind so it cannot be softened ad hoc.
 */
export const REPRESENTATION_LABELS = {
  ILLUSTRATION: "Illustration",
  RECONSTRUCTION: "Reconstruction",
  DRAMATIZATION: "Dramatization",
  AI_GENERATED_RECONSTRUCTION: "AI-generated reconstruction",
} as const;
export const representationLabelSchema = z.enum([
  "ILLUSTRATION",
  "RECONSTRUCTION",
  "DRAMATIZATION",
  "AI_GENERATED_RECONSTRUCTION",
]);
export type RepresentationLabel = z.infer<typeof representationLabelSchema>;

export const representationSchema = z.discriminatedUnion("type", [
  /** Authentic record (archival photo, real filing) — or pure typography. */
  z.object({ type: z.literal("AUTHENTIC") }),
  z.object({ type: z.literal("GRAPHIC") }),
  z.object({
    type: z.literal("ILLUSTRATIVE"),
    label: representationLabelSchema,
  }),
]);
export type Representation = z.infer<typeof representationSchema>;

/**
 * A visual STATE within a shot. One shot is not one static image: a
 * 10-second document shot can establish the page, move to a paragraph,
 * highlight a sentence, dim the rest, then hand a date to the timeline.
 * States change when the viewer needs new information, emphasis, spatial
 * context, a reveal, or a comparison — not on a fixed clock.
 */
export const VISUAL_STATES = [
  "ESTABLISH", // full view of the subject
  "MOVE_TO", // camera/crop travels to a region
  "HIGHLIGHT", // emphasize a passage, marker, or item
  "DIM_OTHERS", // de-emphasize everything but the focus
  "ANNOTATE", // add a label, arrow, or callout
  "REVEAL", // bring in withheld information
  "COMPARE", // place two items side by side
  "HOLD", // deliberate stillness while narration lands
  "HANDOFF", // carry an element into the next shot (e.g. date → timeline)
] as const;
export const visualStateSchema = z.enum(VISUAL_STATES);
export type VisualState = z.infer<typeof visualStateSchema>;

export const sceneBeatSchema = z.object({
  id: idSchema("sceneBeat"),
  /** Visual state entered at this beat. Omitted = descriptive beat only. */
  state: visualStateSchema.optional(),
  /** What the state acts on, e.g. a claim's excerpt or an on-screen text. */
  target: z.string().optional(),
  /** Anchor the beat to the start of a narration unit (plus offset). */
  atNarrationId: idSchema("narration").optional(),
  offsetSec: z.number().min(0).default(0),
  description: nonEmpty,
  claimIds: z.array(idSchema("claim")).default([]),
});
export type SceneBeat = z.infer<typeof sceneBeatSchema>;

/** On-screen text is a factual statement too, so it carries claim links. */
export const onScreenTextSchema = z.object({
  text: nonEmpty,
  role: z.enum([
    "DATE",
    "LOCATION",
    "NAME",
    "TITLE",
    "QUOTE",
    "LABEL",
    "CAPTION",
  ]),
  claimIds: z.array(idSchema("claim")).default([]),
});
export type OnScreenText = z.infer<typeof onScreenTextSchema>;

export const shotSchema = z.object({
  id: idSchema("shot"),
  sequenceId: idSchema("sequence"),
  purpose: nonEmpty,
  /** Narration this shot covers, in order. Drives timing. */
  narrationIds: z.array(idSchema("narration")).min(1),
  /** Overrides narration-derived duration when set. */
  durationSec: z.number().positive().optional(),
  shotType: shotTypeSchema,
  /** What the viewer should understand — NOT which component to use. */
  visualIntent: nonEmpty,
  representation: representationSchema,
  assetRequirementIds: z.array(idSchema("assetRequirement")).default([]),
  cameraDirection: z
    .object({
      movement: z.enum([
        "STATIC",
        "SLOW_PUSH_IN",
        "SLOW_PULL_OUT",
        "PAN",
        "TILT",
        "RACK_FOCUS",
      ]),
      notes: z.string().optional(),
    })
    .optional(),
  compositionDirection: z.string().optional(),
  /** Transition INTO this shot from the previous one. */
  transitionDirection: z
    .object({
      type: z.enum(["CUT", "DISSOLVE", "FADE_THROUGH_BLACK", "MATCH_CUT"]),
      notes: z.string().optional(),
    })
    .optional(),
  onScreenText: z.array(onScreenTextSchema).default([]),
  /** Sources to cite on screen during this shot. */
  citationSourceIds: z.array(idSchema("source")).default([]),
  beats: z.array(sceneBeatSchema).default([]),
});
export type Shot = z.infer<typeof shotSchema>;

export const visualPlanSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("visual-plan"),
  /** Bible revision this plan was made against. Newer bible = stale plan. */
  visualBibleRevision: z.number().int().positive().optional(),
  styleNotes: z.string().optional(),
  assetRequirements: z.array(assetRequirementSchema).default([]),
  /** Shots in playback order. */
  shots: z.array(shotSchema).min(1),
});
export type VisualPlan = z.infer<typeof visualPlanSchema>;
