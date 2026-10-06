import { z } from "zod";
import {
  idSchema,
  isoTimestampSchema,
  nonEmpty,
  partialDateSchema,
  schemaVersionSchema,
} from "./common";

/**
 * Evidentiary weight of a source, strongest first. A DISCOVERY_ONLY source
 * may surface a case but can never be the authority for a factual claim.
 */
export const AUTHORITY_LEVELS = [
  "PRIMARY",
  "STRONG_SECONDARY",
  "SECONDARY",
  "DISCOVERY_ONLY",
] as const;
export const authorityLevelSchema = z.enum(AUTHORITY_LEVELS);
export type AuthorityLevel = z.infer<typeof authorityLevelSchema>;

export const SOURCE_TYPES = [
  // Primary
  "COURT_OPINION",
  "COURT_FILING",
  "COURT_TRANSCRIPT",
  "GOVERNMENT_REPORT",
  "FBI_RECORD",
  "AGENCY_RECORD",
  "ARCHIVAL_DOCUMENT",
  // Strong secondary
  "NEWS_ARTICLE",
  "ACADEMIC_PUBLICATION",
  "HISTORICAL_PUBLICATION",
  "BOOK",
  // Secondary
  "EDUCATIONAL_ARCHIVE",
  "LEGAL_EXPLAINER",
  "CASE_SUMMARY",
  // Discovery only
  "LISTICLE",
  "BLOG",
  "AGGREGATOR",
  "SOCIAL_MEDIA",
  "UNSOURCED_SUMMARY",
  "OTHER",
] as const;
export const sourceTypeSchema = z.enum(SOURCE_TYPES);
export type SourceType = z.infer<typeof sourceTypeSchema>;

/**
 * Rights to reuse a source's *media* on screen (e.g. showing a scanned filing).
 * Independent of whether the source may be cited for facts.
 */
export const RIGHTS_STATUSES = [
  "PUBLIC_DOMAIN",
  "LICENSED",
  "OWNED", // original work created for this project
  "FAIR_USE_REVIEW",
  "PERMISSION_REQUIRED",
  "UNKNOWN",
  "DO_NOT_USE",
] as const;
export const rightsStatusSchema = z.enum(RIGHTS_STATUSES);
export type RightsStatus = z.infer<typeof rightsStatusSchema>;

export const assetUsageStatusSchema = z.enum([
  "NOT_EVALUATED",
  "USABLE",
  "REVIEW_REQUIRED",
  "NOT_USABLE",
]);
export type AssetUsageStatus = z.infer<typeof assetUsageStatusSchema>;

export const caseSourceSchema = z.object({
  id: idSchema("source"),
  url: z.url(),
  title: nonEmpty,
  publisher: nonEmpty,
  sourceType: sourceTypeSchema,
  authorityLevel: authorityLevelSchema,
  accessedAt: isoTimestampSchema,
  publicationDate: partialDateSchema.optional(),
  author: z.string().optional(),
  /** Archive/snapshot URL (e.g. Wayback) so citations survive link rot. */
  archivedUrl: z.url().optional(),
  /** Court docket or record identifier, when applicable. */
  recordIdentifier: z.string().optional(),
  rightsStatus: rightsStatusSchema.optional(),
  assetUsageStatus: assetUsageStatusSchema.optional(),
  notes: z.string().optional(),
});
export type CaseSource = z.infer<typeof caseSourceSchema>;

/**
 * Points at a specific place inside a source. At least one locator field
 * should be given for PRIMARY sources so a reviewer can find the passage.
 */
export const sourceReferenceSchema = z.object({
  sourceId: idSchema("source"),
  page: z.string().optional(),
  section: z.string().optional(),
  paragraph: z.string().optional(),
  /** Timestamp within audio/video sources, e.g. "00:14:32". */
  timestamp: z.string().optional(),
  /** Docket entry number for court filings. */
  docketEntry: z.string().optional(),
  /** Verbatim text from the source that the claim relies on. */
  excerpt: z.string().optional(),
});
export type SourceReference = z.infer<typeof sourceReferenceSchema>;

export const sourcesFileSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("sources"),
  sources: z.array(caseSourceSchema),
});
export type SourcesFile = z.infer<typeof sourcesFileSchema>;
