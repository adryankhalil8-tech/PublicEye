import { syntheticTernRiverPayroll } from "../fixtures/cases/synthetic-tern-river-payroll";
import type { CaseWorkspace, RawWorkspace } from "../src/domain";
import {
  parseWorkspace,
  validateWorkspace,
  type ValidationIssue,
} from "../src/validation";

export const rawFixture = (): RawWorkspace =>
  structuredClone(syntheticTernRiverPayroll);

export const fixture = (): CaseWorkspace => {
  const parsed = parseWorkspace(rawFixture());
  if (!parsed.ok)
    throw new Error(
      `fixture failed to parse: ${JSON.stringify(parsed.issues, null, 2)}`,
    );
  return parsed.workspace;
};

/** Clone the valid fixture, apply one mutation, return validation issues. */
export const issuesAfter = (
  mutate: (ws: CaseWorkspace) => void,
): ValidationIssue[] => {
  const ws = fixture();
  mutate(ws);
  return validateWorkspace(ws);
};

export const codes = (
  issues: ValidationIssue[],
  severity?: ValidationIssue["severity"],
) =>
  issues.filter((i) => !severity || i.severity === severity).map((i) => i.code);

export const errorCodes = (issues: ValidationIssue[]) => codes(issues, "ERROR");

export const find = <T extends { id: string }>(
  items: T[] | undefined,
  id: string,
): T => {
  const item = items?.find((i) => i.id === id);
  if (!item) throw new Error(`test setup: no item ${id}`);
  return item;
};
