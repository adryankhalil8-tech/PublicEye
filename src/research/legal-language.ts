import type { CaseClaim, LegalStatus } from "../domain";

export type LegalTermRule = {
  pattern: RegExp;
  requires: LegalStatus[];
  label: string;
  /** ERROR for outcome words that are unambiguous in context. */
  severity: "ERROR" | "WARNING";
};

/**
 * Words that assert a legal outcome. If narration uses one, it must be backed
 * by a SUPPORTED LEGAL_STATUS claim with a matching status in the same unit.
 */
export const LEGAL_TERM_RULES: LegalTermRule[] = [
  {
    pattern:
      /\bconvicted\b|\bconviction\b|\bfound guilty\b|\bplead(?:ed)? guilty\b|\bpled guilty\b/i,
    requires: ["CONVICTED", "OVERTURNED"],
    label: "conviction",
    severity: "ERROR",
  },
  {
    pattern: /\bacquitted\b|\bacquittal\b|\bfound not guilty\b/i,
    requires: ["ACQUITTED"],
    label: "acquittal",
    severity: "ERROR",
  },
  {
    pattern: /\bindicted\b|\bindictment\b/i,
    requires: ["INDICTED"],
    label: "indictment",
    severity: "ERROR",
  },
  {
    pattern:
      /\bcharged with\b|\bcharges against\b|\bfaced charges\b|\bwas charged\b/i,
    requires: ["CHARGED", "INDICTED"],
    label: "charge",
    severity: "ERROR",
  },
  {
    pattern:
      /\bwas arrested\b|\bwere arrested\b|\barrested (?:him|her|them)\b/i,
    requires: ["ARRESTED", "CHARGED", "INDICTED", "CONVICTED"],
    label: "arrest",
    severity: "WARNING",
  },
  {
    pattern:
      /\boverturned\b|\bvacated\b|\breversed on appeal\b|\bexonerated\b/i,
    requires: ["OVERTURNED"],
    label: "overturned",
    severity: "WARNING",
  },
  {
    pattern: /\b(?:case|charges?) (?:was |were )?dismissed\b/i,
    requires: ["DISMISSED"],
    label: "dismissal",
    severity: "WARNING",
  },
];

/**
 * Labels that presume guilt. Flag for human review whenever they appear —
 * even a conviction does not make every label accurate.
 */
export const GUILT_LABELS =
  /\b(murderer|killer|thief|embezzler|fraudster|rapist|kidnapper|the culprit|the perpetrator)\b/i;

/** Words showing a statement is attributed rather than asserted. */
export const ATTRIBUTION_MARKERS =
  /\b(alleg\w*|accus\w*|according to|claimed|claims|said|says|told|testified|testimony|reported|stated|argued|insisted|maintained|denied|prosecutors?|police|investigators?|detectives?|the (?:state|prosecution|defen[cs]e))\b/i;

export const legalStatusesBackedBy = (
  claims: CaseClaim[],
): Set<LegalStatus> => {
  const statuses = new Set<LegalStatus>();
  for (const c of claims) {
    if (c.status === "SUPPORTED" && c.assertion.type === "LEGAL_STATUS") {
      statuses.add(c.assertion.legalStatus);
    }
  }
  return statuses;
};
