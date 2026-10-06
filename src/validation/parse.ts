import type { z } from "zod";
import {
  assetsFileSchema,
  caseProjectSchema,
  caseVisualBibleSchema,
  caseTimelineSchema,
  claimsFileSchema,
  entitiesFileSchema,
  narrationAlignmentSchema,
  narrationArtifactSchema,
  productionManifestSchema,
  qaReportSchema,
  researchBriefSchema,
  SCHEMA_VERSION,
  scriptDocumentSchema,
  sourcesFileSchema,
  storyPlanSchema,
  visualPlanSchema,
  WORKSPACE_FILES,
  youtubePackageSchema,
  type CaseWorkspace,
  type RawWorkspace,
} from "../domain";
import { IssueCollector, type ValidationIssue } from "./issues";

const SCHEMAS = {
  project: caseProjectSchema,
  sources: sourcesFileSchema,
  claims: claimsFileSchema,
  entities: entitiesFileSchema,
  timeline: caseTimelineSchema,
  research: researchBriefSchema,
  story: storyPlanSchema,
  script: scriptDocumentSchema,
  narration: narrationArtifactSchema,
  alignment: narrationAlignmentSchema,
  visualBible: caseVisualBibleSchema,
  visualPlan: visualPlanSchema,
  assets: assetsFileSchema,
  manifest: productionManifestSchema,
  qaReport: qaReportSchema,
  youtubePackage: youtubePackageSchema,
} satisfies { [K in keyof CaseWorkspace]-?: z.ZodType };

const REQUIRED: (keyof CaseWorkspace)[] = [
  "project",
  "sources",
  "claims",
  "entities",
  "timeline",
  "research",
];

const fileName = (key: keyof CaseWorkspace) =>
  key === "project" ? WORKSPACE_FILES.case : WORKSPACE_FILES[key];

export type ParseResult =
  | { ok: true; workspace: CaseWorkspace; issues: ValidationIssue[] }
  | { ok: false; workspace: null; issues: ValidationIssue[] };

/**
 * Schema-validate each raw artifact. Reports a dedicated SCHEMA_VERSION issue
 * (rather than a generic schema error) when a file is from another version,
 * so migrations are easy to spot.
 */
export const parseWorkspace = (raw: RawWorkspace): ParseResult => {
  const c = new IssueCollector();
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(SCHEMAS) as (keyof CaseWorkspace)[]) {
    const value = raw[key];
    const file = fileName(key);
    if (value === undefined) {
      if (REQUIRED.includes(key))
        c.error("MISSING_ARTIFACT", file, "required artifact is missing");
      continue;
    }
    const version = (value as { schemaVersion?: unknown } | null)
      ?.schemaVersion;
    if (version !== SCHEMA_VERSION) {
      c.error(
        "SCHEMA_VERSION",
        file,
        `schemaVersion is ${JSON.stringify(version)}; this build reads version ${SCHEMA_VERSION}`,
      );
      continue;
    }
    const parsed = SCHEMAS[key].safeParse(value);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        c.error(
          "SCHEMA_INVALID",
          `${file}#/${issue.path.join("/")}`,
          issue.message,
        );
      }
      continue;
    }
    out[key] = parsed.data;
  }

  const hasErrors = c.issues.some((i) => i.severity === "ERROR");
  return hasErrors
    ? { ok: false, workspace: null, issues: c.issues }
    : { ok: true, workspace: out as CaseWorkspace, issues: c.issues };
};
