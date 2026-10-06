import { z } from "zod";
import {
  idSchema,
  isoTimestampSchema,
  nonEmpty,
  schemaVersionSchema,
} from "./common";
import { caseTypeSchema, jurisdictionSchema } from "./research";

/**
 * Coarse workflow position shown in case.json. Fine-grained, resumable state
 * lives in runs/<run-id>.json (see src/domain/run.ts). Narration comes
 * BEFORE visual planning: shots are timed to measured audio.
 */
export const CASE_STAGES = [
  "RESEARCH",
  "VERIFICATION",
  "TIMELINE",
  "STORY",
  "SCRIPT",
  "NARRATION",
  "VISUAL_PLAN",
  "ASSETS",
  "RENDER",
  "QC",
  "PACKAGE",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
] as const;
export const caseStageSchema = z.enum(CASE_STAGES);
export type CaseStage = z.infer<typeof caseStageSchema>;

/** File names inside data/cases/<case-id>/. */
export const WORKSPACE_FILES = {
  case: "case.json",
  sources: "sources.json",
  claims: "claims.json",
  entities: "entities.json",
  timeline: "timeline.json",
  research: "research.json",
  researchNotes: "research.md",
  story: "story-plan.json",
  script: "script.json",
  narration: "narration/narration.json",
  alignment: "narration/alignment.json",
  visualBible: "visual-bible.json",
  visualPlan: "visual-plan.json",
  assets: "assets.json",
  manifest: "manifest.json",
  qaReport: "output/qa-report.json",
  youtubePackage: "output/youtube-package.json",
} as const;

/** Directories inside a case workspace. */
export const WORKSPACE_DIRS = {
  narration: "narration",
  runs: "runs",
  output: "output",
} as const;

/** Final deliverables written to output/. The master has NO burned captions. */
export const OUTPUT_FILES = {
  master: "output/master.mp4",
  masterCaptioned: "output/master-captioned.mp4",
  srt: "output/captions.srt",
  ass: "output/captions.ass",
  chapters: "output/chapters.txt",
  credits: "output/credits.txt",
  metadata: "output/metadata.json",
} as const;

/** case.json — the case's identity and status. Artifacts live beside it. */
export const caseProjectSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("case-project"),
  id: idSchema("case"),
  title: nonEmpty,
  caseName: nonEmpty,
  caseType: caseTypeSchema,
  jurisdiction: jurisdictionSchema,
  status: caseStageSchema,
  targetDurationSec: z.number().int().positive(),
  targetPlatform: z.enum(["YOUTUBE"]),
  /** Synthetic fixtures must never be mistaken for real cases. */
  isSynthetic: z.boolean(),
  candidateId: idSchema("candidate").optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type CaseProject = z.infer<typeof caseProjectSchema>;
