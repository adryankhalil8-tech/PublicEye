import type { CaseWorkspace, RawWorkspace } from "../domain";
import {
  checkClaims,
  checkDuplicateIds,
  checkEntities,
  checkProject,
  checkResearchBrief,
  checkSnapshots,
  checkSources,
} from "./checks-research";
import {
  checkAssets,
  checkManifest,
  checkVisualPlan,
} from "./checks-production";
import {
  checkAlignment,
  checkNarration,
  checkVisualBible,
} from "./checks-narration";
import { checkQaReport, checkYouTubePackage } from "./checks-package";
import { checkScript, checkStory } from "./checks-story";
import { checkTimeline } from "./checks-timeline";
import { buildContext } from "./context";
import { countBySeverity, type ValidationIssue } from "./issues";
import { parseWorkspace } from "./parse";

export * from "./issues";
export { parseWorkspace } from "./parse";

/** Cross-reference and policy checks on an already-parsed workspace. */
export const validateWorkspace = (ws: CaseWorkspace): ValidationIssue[] => {
  const ctx = buildContext(ws);
  checkDuplicateIds(ctx);
  checkProject(ctx);
  checkSources(ctx);
  checkSnapshots(ctx);
  checkClaims(ctx);
  checkEntities(ctx);
  checkResearchBrief(ctx);
  checkTimeline(ctx);
  checkStory(ctx);
  checkScript(ctx);
  checkNarration(ctx);
  checkAlignment(ctx);
  checkVisualBible(ctx);
  checkVisualPlan(ctx);
  checkAssets(ctx);
  checkManifest(ctx);
  checkQaReport(ctx);
  checkYouTubePackage(ctx);
  return ctx.c.issues;
};

export type ValidationReport = {
  ok: boolean;
  workspace: CaseWorkspace | null;
  issues: ValidationIssue[];
  counts: ReturnType<typeof countBySeverity>;
};

/** Parse + validate. `ok` means zero ERROR-level issues. */
export const validateRawWorkspace = (raw: RawWorkspace): ValidationReport => {
  const parsed = parseWorkspace(raw);
  const issues = parsed.ok
    ? [...parsed.issues, ...validateWorkspace(parsed.workspace)]
    : parsed.issues;
  const counts = countBySeverity(issues);
  return {
    ok: counts.errors === 0,
    workspace: parsed.workspace,
    issues,
    counts,
  };
};
