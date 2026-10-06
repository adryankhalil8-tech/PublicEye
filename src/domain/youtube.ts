import { z } from "zod";
import {
  idSchema,
  isoTimestampSchema,
  nonEmpty,
  schemaVersionSchema,
} from "./common";

/**
 * Publishing drafts. Nothing here is uploaded automatically. Metadata is
 * held to the same factual rules as the script: titles and descriptions
 * cite claims, and clickability never outranks accuracy.
 */
export const youtubePackageSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("youtube-package"),
  caseId: idSchema("case"),
  generatedAt: isoTimestampSchema,
  status: z.enum(["DRAFT", "READY_FOR_REVIEW", "APPROVED"]),
  titleCandidates: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(100),
        claimIds: z.array(idSchema("claim")).default([]),
        rationale: z.string().optional(),
      }),
    )
    .min(1),
  description: z.object({
    text: z.string().trim().min(1).max(5000),
    claimIds: z.array(idSchema("claim")).default([]),
  }),
  /** YouTube rules: first at 0:00, ≥3 chapters, each ≥10 s, ascending. */
  chapters: z.array(z.object({ startSec: z.number().min(0), title: nonEmpty })),
  tags: z.array(nonEmpty).default([]),
  thumbnailBrief: z.object({
    concept: nonEmpty,
    textOverlay: z.string().optional(),
    imagery: nonEmpty,
    /** e.g. "must not imply the acquitted defendant is guilty". */
    mustNotImply: z.array(nonEmpty).min(1),
  }),
  credits: z.array(nonEmpty),
  sourceNotes: z.array(
    z.object({ sourceId: idSchema("source"), citation: nonEmpty }),
  ),
  publishingChecklist: z.array(z.object({ item: nonEmpty, done: z.boolean() })),
});
export type YouTubePackage = z.infer<typeof youtubePackageSchema>;
