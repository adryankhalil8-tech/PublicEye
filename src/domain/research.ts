import { z } from "zod";
import {
  idSchema,
  isoTimestampSchema,
  nonEmpty,
  schemaVersionSchema,
} from "./common";

export const caseTypeSchema = z.enum([
  "HOMICIDE",
  "KIDNAPPING",
  "ROBBERY",
  "FRAUD",
  "ESPIONAGE",
  "ORGANIZED_CRIME",
  "CORRUPTION",
  "TERRORISM",
  "CIVIL_RIGHTS",
  "HISTORICAL_TRIAL",
  "OTHER",
]);
export type CaseType = z.infer<typeof caseTypeSchema>;

export const jurisdictionSchema = z.object({
  country: nonEmpty,
  region: z.string().optional(),
  courts: z.array(z.string()).default([]),
});
export type Jurisdiction = z.infer<typeof jurisdictionSchema>;

/** Flags that call for editorial/legal care before production. */
export const sensitivityFlagSchema = z.enum([
  "MINORS_INVOLVED",
  "LIVING_PRIVATE_INDIVIDUALS",
  "ONGOING_PROCEEDINGS",
  "RECENT_EVENTS",
  "SEXUAL_VIOLENCE",
  "GRAPHIC_VIOLENCE",
  "CONTESTED_OUTCOME",
  "VICTIM_FAMILY_SENSITIVITY",
]);
export type SensitivityFlag = z.infer<typeof sensitivityFlagSchema>;

/**
 * A case surfaced by discovery. `discoveredVia` may be a DISCOVERY_ONLY
 * source; that is fine here — it is never used as factual authority.
 */
export const caseCandidateSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("case-candidate"),
  id: idSchema("candidate"),
  name: nonEmpty,
  summary: nonEmpty,
  caseType: caseTypeSchema,
  jurisdiction: jurisdictionSchema,
  era: z.string().optional(),
  discoveredVia: z.array(z.object({ url: z.url(), title: z.string() })).min(1),
  /** Primary sources known to exist (court opinions, FBI files…). */
  knownPrimarySources: z
    .array(z.object({ url: z.url(), title: z.string() }))
    .default([]),
  sensitivityFlags: z.array(sensitivityFlagSchema).default([]),
  status: z.enum(["CANDIDATE", "SHORTLISTED", "SELECTED", "REJECTED"]),
  rejectionReason: z.string().optional(),
  isSynthetic: z.boolean().default(false),
  createdAt: isoTimestampSchema,
  notes: z.string().optional(),
});
export type CaseCandidate = z.infer<typeof caseCandidateSchema>;

export const openQuestionSchema = z.object({
  id: idSchema("question"),
  question: nonEmpty,
  status: z.enum(["OPEN", "RESOLVED", "UNRESOLVABLE"]),
  relatedClaimIds: z.array(idSchema("claim")).default([]),
  resolution: z.string().optional(),
});
export type OpenQuestion = z.infer<typeof openQuestionSchema>;

export const contradictionSchema = z.object({
  id: idSchema("contradiction"),
  description: nonEmpty,
  claimIds: z.array(idSchema("claim")).min(1),
  sourceIds: z.array(idSchema("source")).min(1),
  resolution: z.string().optional(),
});
export type Contradiction = z.infer<typeof contradictionSchema>;

/** Structured research package. Long-form notes live in research.md. */
export const researchBriefSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("research-brief"),
  summary: nonEmpty,
  sensitivityFlags: z.array(sensitivityFlagSchema).default([]),
  openQuestions: z.array(openQuestionSchema).default([]),
  contradictions: z.array(contradictionSchema).default([]),
  /** Sources we know exist but have not yet obtained/read. */
  sourcesToObtain: z
    .array(z.object({ description: nonEmpty, url: z.url().optional() }))
    .default([]),
  notes: z.string().optional(),
});
export type ResearchBrief = z.infer<typeof researchBriefSchema>;
