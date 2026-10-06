/**
 * Scaffold a new case workspace with the minimum valid research artifacts.
 *
 *   npm run new:case -- <kebab-slug> "<Case name>"
 *
 * Creates data/cases/case-<slug>/. Downstream artifacts (story, script,
 * visual plan…) are created later by their skills, not here.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SCHEMA_VERSION, WORKSPACE_FILES } from "../src/domain";
import { validateRawWorkspace } from "../src/validation";
import { CASES_DIR, readRawWorkspace, writeJson } from "./lib/workspace-fs";

const [slug, ...nameParts] = process.argv.slice(2);
const caseName = nameParts.join(" ").trim();
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !caseName) {
  console.error('usage: npm run new:case -- <kebab-slug> "<Case name>"');
  process.exit(2);
}

const id = `case-${slug}`;
const dir = path.join(CASES_DIR, id);
if (existsSync(dir)) {
  console.error(`Refusing to overwrite existing workspace: ${dir}`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });

const now = new Date().toISOString();
const v = SCHEMA_VERSION;
writeJson(path.join(dir, WORKSPACE_FILES.case), {
  schemaVersion: v,
  kind: "case-project",
  id,
  title: caseName,
  caseName,
  caseType: "OTHER",
  jurisdiction: { country: "TBD", courts: [] },
  status: "RESEARCH",
  targetDurationSec: 480,
  targetPlatform: "YOUTUBE",
  isSynthetic: false,
  createdAt: now,
  updatedAt: now,
});
writeJson(path.join(dir, WORKSPACE_FILES.sources), {
  schemaVersion: v,
  kind: "sources",
  sources: [],
});
writeJson(path.join(dir, WORKSPACE_FILES.claims), {
  schemaVersion: v,
  kind: "claims",
  claims: [],
});
writeJson(path.join(dir, WORKSPACE_FILES.entities), {
  schemaVersion: v,
  kind: "entities",
  people: [],
  organizations: [],
  locations: [],
});
writeJson(path.join(dir, WORKSPACE_FILES.timeline), {
  schemaVersion: v,
  kind: "timeline",
  events: [],
  gaps: [],
});
writeJson(path.join(dir, WORKSPACE_FILES.research), {
  schemaVersion: v,
  kind: "research-brief",
  summary: "TODO: one-paragraph summary once primary sources are read.",
  sensitivityFlags: [],
  openQuestions: [],
  contradictions: [],
  sourcesToObtain: [],
});
writeFileSync(
  path.join(dir, WORKSPACE_FILES.researchNotes),
  `# Research Notes — ${caseName}\n\n## Summary\n\n_TODO_\n\n## Source assessment\n\n| Source | Authority | Use |\n| --- | --- | --- |\n\n## Open questions\n\n## Sensitivity\n`,
  "utf8",
);

const report = validateRawWorkspace(readRawWorkspace(dir));
console.log(`Created ${dir}`);
console.log(
  report.ok
    ? "Workspace validates."
    : "WARNING: scaffold failed validation — please report.",
);
