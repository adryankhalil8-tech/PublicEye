import type { CaseCandidate } from "../domain";
import type { ValidationIssue } from "../validation/issues";

/**
 * Case selection rules. Agents propose candidates (CANDIDATE / SHORTLISTED);
 * only a named human may SELECT or REJECT one.
 */
export const validateCandidate = (c: CaseCandidate): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const path = `candidates/${c.id}.json`;
  const add = (
    severity: ValidationIssue["severity"],
    code: string,
    message: string,
  ) => issues.push({ severity, code, path, message });

  if (c.status === "SELECTED" || c.status === "REJECTED") {
    if (!c.decision || !/^human:\S/.test(c.decision.by)) {
      add(
        "ERROR",
        "CANDIDATE_DECISION_NOT_HUMAN",
        `${c.status} requires a decision by "human:<name>"`,
      );
    }
  }
  if (c.status === "REJECTED" && !c.rejectionReason)
    add(
      "ERROR",
      "CANDIDATE_REJECTION_UNEXPLAINED",
      "REJECTED requires rejectionReason",
    );
  if (!c.isSynthetic && c.knownPrimarySources.length === 0) {
    add(
      "WARNING",
      "CANDIDATE_NO_PRIMARY_SOURCES",
      "no primary records identified — the case may not be documentable",
    );
  }
  const urls = [...c.discoveredVia, ...c.knownPrimarySources].map((s) => s.url);
  if (
    !c.isSynthetic &&
    urls.some((u) => /\.invalid(\/|$)/.test(new URL(u).hostname + "/"))
  ) {
    add(
      "ERROR",
      "CANDIDATE_PLACEHOLDER_URL",
      "real candidate cites a placeholder URL",
    );
  }
  if (c.sensitivityFlags.includes("MINORS_INVOLVED")) {
    add(
      "WARNING",
      "CANDIDATE_MINORS",
      "minors involved — needs explicit editorial review before selection",
    );
  }
  if (c.sensitivityFlags.includes("ONGOING_PROCEEDINGS")) {
    add(
      "WARNING",
      "CANDIDATE_ONGOING",
      "ongoing proceedings — not suitable for this channel's first cases",
    );
  }
  return issues;
};

/** Record a human decision on a candidate. Throws if the decider is not human. */
export const decideCandidate = (
  c: CaseCandidate,
  decision: {
    status: "SELECTED" | "REJECTED";
    by: string;
    at: string;
    notes?: string;
    reason?: string;
  },
): CaseCandidate => {
  if (!/^human:\S/.test(decision.by))
    throw new Error(
      `case selection is a human decision ("human:<name>"), got "${decision.by}"`,
    );
  if (decision.status === "REJECTED" && !decision.reason)
    throw new Error("rejecting a candidate requires a reason");
  return {
    ...c,
    status: decision.status,
    decision: { by: decision.by, at: decision.at, notes: decision.notes },
    rejectionReason:
      decision.status === "REJECTED" ? decision.reason : c.rejectionReason,
  };
};
