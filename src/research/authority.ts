import {
  AUTHORITY_LEVELS,
  type AuthorityLevel,
  type CaseSource,
  type SourceType,
} from "../domain";

/** 0 = strongest. */
export const authorityRank = (level: AuthorityLevel): number =>
  AUTHORITY_LEVELS.indexOf(level);

export const isAtLeast = (level: AuthorityLevel, minimum: AuthorityLevel) =>
  authorityRank(level) <= authorityRank(minimum);

/**
 * The strongest authority a source type may claim. A researcher may *lower*
 * a source (e.g. a tabloid NEWS_ARTICLE → SECONDARY) but never raise it
 * above its type's ceiling: a blog cannot be PRIMARY.
 */
export const AUTHORITY_CEILING: Record<SourceType, AuthorityLevel> = {
  COURT_OPINION: "PRIMARY",
  COURT_FILING: "PRIMARY",
  COURT_TRANSCRIPT: "PRIMARY",
  GOVERNMENT_REPORT: "PRIMARY",
  FBI_RECORD: "PRIMARY",
  AGENCY_RECORD: "PRIMARY",
  ARCHIVAL_DOCUMENT: "PRIMARY",
  NEWS_ARTICLE: "STRONG_SECONDARY",
  ACADEMIC_PUBLICATION: "STRONG_SECONDARY",
  HISTORICAL_PUBLICATION: "STRONG_SECONDARY",
  BOOK: "STRONG_SECONDARY",
  EDUCATIONAL_ARCHIVE: "SECONDARY",
  LEGAL_EXPLAINER: "SECONDARY",
  CASE_SUMMARY: "SECONDARY",
  LISTICLE: "DISCOVERY_ONLY",
  BLOG: "DISCOVERY_ONLY",
  AGGREGATOR: "DISCOVERY_ONLY",
  SOCIAL_MEDIA: "DISCOVERY_ONLY",
  UNSOURCED_SUMMARY: "DISCOVERY_ONLY",
  OTHER: "SECONDARY",
};

export const exceedsCeiling = (source: CaseSource) =>
  authorityRank(source.authorityLevel) <
  authorityRank(AUTHORITY_CEILING[source.sourceType]);

/** Sources that may be cited as the authority for a factual claim. */
export const canBeFactualAuthority = (source: CaseSource) =>
  source.authorityLevel !== "DISCOVERY_ONLY";
