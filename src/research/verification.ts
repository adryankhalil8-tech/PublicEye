import type {
  AuthorityLevel,
  CaseClaim,
  CaseSource,
  ClaimStatus,
} from "../domain";
import { authorityRank, canBeFactualAuthority, isAtLeast } from "./authority";

export type SupportAssessment = {
  /** Strongest status the evidence can justify on its own. */
  maxJustifiedStatus: ClaimStatus;
  reasons: string[];
  supportingAuthorities: AuthorityLevel[];
  contradictingAuthorities: AuthorityLevel[];
};

const normalize = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Independent = different publishers. Two articles from one wire count once. */
const independentPublishers = (sources: CaseSource[]) =>
  new Set(sources.map((s) => s.publisher.trim().toLowerCase())).size;

/**
 * Evidence policy. Decides the strongest status a claim's evidence can
 * justify; validation flags any claim whose recorded status exceeds it.
 *
 * SUPPORTED requires at least one SUPPORTS evidence from a non-discovery
 * source, plus:
 * - CORE claims: a PRIMARY source, or ≥2 independent STRONG_SECONDARY.
 * - LEGAL_STATUS claims: PRIMARY or STRONG_SECONDARY (court outcomes are
 *   exactly where secondary summaries get sloppy).
 * - QUOTE claims: PRIMARY or STRONG_SECONDARY evidence whose excerpt contains
 *   the quote verbatim.
 * A contradiction from equal-or-stronger authority caps the claim at DISPUTED.
 */
export const assessClaimSupport = (
  claim: CaseClaim,
  sourcesById: Map<string, CaseSource>,
): SupportAssessment => {
  const reasons: string[] = [];
  const supporting = claim.evidence
    .filter((e) => e.stance === "SUPPORTS")
    .map((e) => ({ e, s: sourcesById.get(e.reference.sourceId) }))
    .filter((x): x is { e: typeof x.e; s: CaseSource } => x.s !== undefined);
  const contradicting = claim.evidence
    .filter((e) => e.stance === "CONTRADICTS")
    .map((e) => sourcesById.get(e.reference.sourceId))
    .filter((s): s is CaseSource => s !== undefined);

  const authoritative = supporting.filter((x) => canBeFactualAuthority(x.s));
  const supportingAuthorities = authoritative.map((x) => x.s.authorityLevel);
  const contradictingAuthorities = contradicting
    .filter(canBeFactualAuthority)
    .map((s) => s.authorityLevel);

  const result = (maxJustifiedStatus: ClaimStatus): SupportAssessment => ({
    maxJustifiedStatus,
    reasons,
    supportingAuthorities,
    contradictingAuthorities,
  });

  if (supporting.length > 0 && authoritative.length === 0) {
    reasons.push("only DISCOVERY_ONLY sources support this claim");
  }
  if (authoritative.length === 0) {
    reasons.push("no supporting evidence from a citable source");
    return result("INSUFFICIENT_EVIDENCE");
  }

  const bestSupport = Math.min(...supportingAuthorities.map(authorityRank));
  const bestContra = contradictingAuthorities.length
    ? Math.min(...contradictingAuthorities.map(authorityRank))
    : Infinity;

  const hasPrimary = supportingAuthorities.includes("PRIMARY");
  const strong = authoritative.filter((x) =>
    isAtLeast(x.s.authorityLevel, "STRONG_SECONDARY"),
  );

  let sufficient = true;
  if (
    claim.importance === "CORE" &&
    !hasPrimary &&
    independentPublishers(strong.map((x) => x.s)) < 2
  ) {
    reasons.push(
      "CORE claim needs a PRIMARY source or two independent STRONG_SECONDARY sources",
    );
    sufficient = false;
  }
  if (claim.assertion.type === "LEGAL_STATUS" && strong.length === 0) {
    reasons.push("legal status needs PRIMARY or STRONG_SECONDARY support");
    sufficient = false;
  }
  if (claim.assertion.type === "QUOTE") {
    const quote = normalize(claim.assertion.quoteText);
    const verbatim = strong.some(
      (x) =>
        x.e.reference.excerpt &&
        normalize(x.e.reference.excerpt).includes(quote),
    );
    if (!verbatim) {
      reasons.push(
        "quote not found verbatim in a PRIMARY/STRONG_SECONDARY evidence excerpt",
      );
      sufficient = false;
    }
  }

  if (bestContra <= bestSupport) {
    reasons.push("contradicted by a source of equal or greater authority");
    return result("DISPUTED");
  }
  return result(sufficient ? "SUPPORTED" : "INSUFFICIENT_EVIDENCE");
};

/**
 * How statuses rank for "may the record claim X given the evidence?".
 * DISPUTED/CONTRADICTED are editorial judgements and are always permitted
 * (they make weaker, not stronger, statements).
 */
export const statusExceedsEvidence = (
  recorded: ClaimStatus,
  justified: ClaimStatus,
) => recorded === "SUPPORTED" && justified !== "SUPPORTED";

/** Claims a script may state plainly. Nothing else becomes "fact". */
export const isEstablished = (claim: CaseClaim) => claim.status === "SUPPORTED";
