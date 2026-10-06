export type Severity = "ERROR" | "WARNING" | "INFO";

/**
 * One validation finding. `code` is stable (tests and tooling match on it);
 * `path` points at the artifact and element, e.g. "claims.json#clm-arrest".
 */
export type ValidationIssue = {
  severity: Severity;
  code: string;
  path: string;
  message: string;
};

export class IssueCollector {
  readonly issues: ValidationIssue[] = [];

  error(code: string, path: string, message: string) {
    this.issues.push({ severity: "ERROR", code, path, message });
  }
  warn(code: string, path: string, message: string) {
    this.issues.push({ severity: "WARNING", code, path, message });
  }
  info(code: string, path: string, message: string) {
    this.issues.push({ severity: "INFO", code, path, message });
  }
}

export const countBySeverity = (issues: ValidationIssue[]) => ({
  errors: issues.filter((i) => i.severity === "ERROR").length,
  warnings: issues.filter((i) => i.severity === "WARNING").length,
  infos: issues.filter((i) => i.severity === "INFO").length,
});

export const formatIssue = (i: ValidationIssue) =>
  `${i.severity.padEnd(7)} ${i.code.padEnd(34)} ${i.path}\n        ${i.message}`;
