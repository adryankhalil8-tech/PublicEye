/**
 * Case candidates (data/candidates/<cand-id>.json).
 *
 *   npm run candidate -- list
 *   npm run candidate -- validate
 *   npm run candidate -- select <cand-id> --by="human:Your Name" [--notes="…"]
 *   npm run candidate -- reject <cand-id> --by="human:Your Name" --reason="…"
 *
 * Selecting/rejecting is a HUMAN tool. Agents write CANDIDATE/SHORTLISTED
 * records and stop. After selection: npm run new:case -- <slug> "<Name>".
 */
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { caseCandidateSchema, type CaseCandidate } from "../src/domain";
import { decideCandidate, validateCandidate } from "../src/research/candidates";
import { formatIssue } from "../src/validation";
import { flag, ROOT, writeJson } from "./lib/workspace-fs";

const DIR = path.join(ROOT, "data", "candidates");
const [cmd, id, ...rest] = process.argv.slice(2);

const load = (): { file: string; c: CaseCandidate }[] => {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      file: path.join(DIR, f),
      c: caseCandidateSchema.parse(
        JSON.parse(readFileSync(path.join(DIR, f), "utf8")),
      ),
    }));
};

try {
  if (cmd === "list") {
    for (const { c } of load()) {
      console.log(
        `${c.status.padEnd(11)} ${c.id.padEnd(32)} ${c.name}${c.decision ? `  (by ${c.decision.by})` : ""}`,
      );
      console.log(
        `${" ".repeat(12)}${c.knownPrimarySources.length} primary source(s) · flags: ${c.sensitivityFlags.join(", ") || "none"}`,
      );
    }
  } else if (cmd === "validate") {
    const issues = load().flatMap(({ c }) => validateCandidate(c));
    issues.forEach((i) => console.log(formatIssue(i)));
    const errors = issues.filter((i) => i.severity === "ERROR").length;
    console.log(`${errors} error(s), ${issues.length - errors} other`);
    process.exit(errors ? 1 : 0);
  } else if ((cmd === "select" || cmd === "reject") && id) {
    const hit = load().find(({ c }) => c.id === id);
    if (!hit) throw new Error(`no candidate ${id}`);
    const updated = decideCandidate(hit.c, {
      status: cmd === "select" ? "SELECTED" : "REJECTED",
      by: flag(rest, "by") ?? "",
      at: new Date().toISOString(),
      notes: flag(rest, "notes"),
      reason: flag(rest, "reason"),
    });
    writeJson(hit.file, caseCandidateSchema.parse(updated));
    console.log(`${id} → ${updated.status} by ${updated.decision!.by}`);
  } else {
    console.error(
      "usage: npm run candidate -- <list|validate|select|reject> …",
    );
    process.exit(2);
  }
} catch (err) {
  console.error(`REFUSED: ${(err as Error).message}`);
  process.exit(1);
}
