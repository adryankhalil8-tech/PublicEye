/**
 * Validate a case workspace.
 *
 *   npm run validate:case -- <case-id | path> [--all]
 *
 * Prints ERRORs and WARNINGs (add --all for INFO). Exits 1 on any ERROR.
 */
import { formatIssue, validateRawWorkspace } from "../src/validation";
import { readRawWorkspace, resolveCaseDir } from "./lib/workspace-fs";

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
const showAll = args.includes("--all");

if (!target) {
  console.error("usage: npm run validate:case -- <case-id | path> [--all]");
  process.exit(2);
}

const dir = resolveCaseDir(target);
const report = validateRawWorkspace(readRawWorkspace(dir));

console.log(`\nValidating ${dir}\n`);
for (const issue of report.issues) {
  if (issue.severity === "INFO" && !showAll) continue;
  console.log(formatIssue(issue));
}
const { errors, warnings, infos } = report.counts;
console.log(`\n${errors} error(s), ${warnings} warning(s), ${infos} info\n`);
console.log(report.ok ? "RESULT: PASS (no errors)" : "RESULT: FAIL");
process.exit(report.ok ? 0 : 1);
