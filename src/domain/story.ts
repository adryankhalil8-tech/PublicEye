import { z } from "zod";
import { idSchema, nonEmpty, schemaVersionSchema } from "./common";

/**
 * Documentary sections for a 5–10 minute case. Not every case needs every
 * section; order is the plan's choice (e.g. an OUTCOME-first cold open).
 */
export const STORY_SECTIONS = [
  "HOOK",
  "SETUP",
  "BACKGROUND",
  "INCITING_EVENT",
  "INVESTIGATION",
  "EVIDENCE",
  "TURNING_POINT",
  "COURT_CASE",
  "VERDICT_OUTCOME",
  "AFTERMATH",
  "UNRESOLVED_QUESTIONS",
  "ENDING",
] as const;
export const storySectionSchema = z.enum(STORY_SECTIONS);
export type StorySection = z.infer<typeof storySectionSchema>;

export const storyAngleSchema = z.object({
  id: idSchema("angle"),
  title: nonEmpty,
  logline: nonEmpty,
  centralQuestion: nonEmpty,
  whyItWorks: nonEmpty,
  /** Claims the angle depends on. If any is not SUPPORTED, the angle is at risk. */
  requiredClaimIds: z.array(idSchema("claim")).min(1),
  risks: z.array(z.string()).default([]),
});
export type StoryAngle = z.infer<typeof storyAngleSchema>;

export const storyBeatSchema = z.object({
  id: idSchema("storyBeat"),
  description: nonEmpty,
  claimIds: z.array(idSchema("claim")).default([]),
  eventIds: z.array(idSchema("event")).default([]),
});
export type StoryBeat = z.infer<typeof storyBeatSchema>;

export const storySequenceSchema = z.object({
  id: idSchema("sequence"),
  section: storySectionSchema,
  title: nonEmpty,
  purpose: nonEmpty,
  targetDurationSec: z.number().positive(),
  beats: z.array(storyBeatSchema).min(1),
});
export type StorySequence = z.infer<typeof storySequenceSchema>;

/**
 * A reveal is information deliberately withheld and then delivered.
 * Tension comes from *ordering* verified facts, never from inventing them.
 */
export const revealSchema = z.object({
  id: idSchema("reveal"),
  description: nonEmpty,
  claimIds: z.array(idSchema("claim")).min(1),
  setupSequenceId: idSchema("sequence"),
  payoffSequenceId: idSchema("sequence"),
});
export type Reveal = z.infer<typeof revealSchema>;

export const emotionalToneSchema = z.enum([
  "CURIOSITY",
  "UNEASE",
  "TENSION",
  "GRAVITY",
  "SURPRISE",
  "SOMBER",
  "REFLECTIVE",
  "RESOLVE",
]);

export const storyPlanSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("story-plan"),
  angle: storyAngleSchema,
  alternativeAngles: z.array(storyAngleSchema).default([]),
  hook: z.object({
    strategy: z.enum([
      "COLD_OPEN_EVENT",
      "OUTCOME_FIRST",
      "CENTRAL_QUESTION",
      "CONTRAST",
      "DOCUMENT_DETAIL",
    ]),
    description: nonEmpty,
    claimIds: z.array(idSchema("claim")).min(1),
  }),
  centralQuestion: nonEmpty,
  /** Section order as the viewer experiences it. */
  narrativeArc: z.array(storySectionSchema).min(1),
  sequences: z.array(storySequenceSchema).min(1),
  reveals: z.array(revealSchema).default([]),
  pacing: z.object({
    targetTotalSec: z.number().positive(),
    notes: z.string().optional(),
  }),
  emotionalProgression: z.array(
    z.object({
      sequenceId: idSchema("sequence"),
      tone: emotionalToneSchema,
      intensity: z.number().int().min(1).max(5),
    }),
  ),
  endingStrategy: z.object({
    type: z.enum(["RESOLUTION", "OPEN_QUESTION", "AFTERMATH", "REFLECTION"]),
    description: nonEmpty,
    claimIds: z.array(idSchema("claim")).default([]),
  }),
});
export type StoryPlan = z.infer<typeof storyPlanSchema>;
