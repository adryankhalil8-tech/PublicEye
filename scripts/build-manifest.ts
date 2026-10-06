/**
 * Build manifest.json for a case from its script + visual plan.
 *
 *   npm run build:manifest -- <case-id | path> [--generated-at=ISO]
 *
 * Refuses to write if the workspace has validation ERRORs.
 */
import path from "node:path";
import { writeFileSync } from "node:fs";
import { buildManifest, serializeManifest } from "../src/production/manifest";
import { formatIssue, validateRawWorkspace } from "../src/validation";
import { readRawWorkspace, resolveCaseDir } from "./lib/workspace-fs";

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
const generatedAt =
  args.find((a) => a.startsWith("--generated-at="))?.split("=")[1] ??
  new Date().toISOString();

if (!target) {
  console.error(
    "usage: npm run build:manifest -- <case-id | path> [--generated-at=ISO]",
  );
  process.exit(2);
}

const dir = resolveCaseDir(target);
const raw = readRawWorkspace(dir);
// Validate without the old manifest so a stale one cannot block a rebuild.
const report = validateRawWorkspace({ ...raw, manifest: undefined });
if (!report.ok || !report.workspace) {
  report.issues
    .filter((i) => i.severity === "ERROR")
    .forEach((i) => console.error(formatIssue(i)));
  console.error("\nManifest NOT written: fix validation errors first.");
  process.exit(1);
}

const manifest = buildManifest(report.workspace, { generatedAt });
const out = path.join(dir, "manifest.json");
writeFileSync(out, serializeManifest(manifest), "utf8");
const secs = (manifest.render.durationInFrames / manifest.render.fps).toFixed(
  1,
);
console.log(
  `Wrote ${out}: ${manifest.shots.length} shots, ${secs}s, ${manifest.assets.length} assets`,
);
