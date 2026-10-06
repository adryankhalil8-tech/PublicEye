/**
 * Project health snapshot: runs every quality gate, times it, and records
 * the result so trends are visible over time.
 *
 *   npm run health            # run gates, append to docs/health/HEALTH_LOG.md
 *   npm run health -- --no-log
 *
 * Writes docs/health/latest.json (overwritten) and appends one row to
 * docs/health/HEALTH_LOG.md. Exits 1 if any gate fails.
 */
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { validateRawWorkspace } from "../src/validation";
import { readRawWorkspace, ROOT } from "./lib/workspace-fs";

type Gate = { name: string; cmd: string; pass: boolean; seconds: number };

const HEALTH_DIR = path.join(ROOT, "docs", "health");
const SCRATCH = path.join(ROOT, ".health");
const FIXTURE = path.join(
  ROOT,
  "fixtures",
  "cases",
  "synthetic-tern-river-payroll",
);

const run = (name: string, cmd: string): Gate => {
  const t0 = performance.now();
  const r = spawnSync(cmd, { cwd: ROOT, shell: true, encoding: "utf8" });
  const seconds = Math.round((performance.now() - t0) / 100) / 10;
  const pass = r.status === 0;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name.padEnd(14)} ${seconds}s`);
  if (!pass)
    console.log((r.stdout + r.stderr).split("\n").slice(-25).join("\n"));
  return { name, cmd, pass, seconds };
};

const countLines = (
  dir: string,
  exts: string[],
): { files: number; lines: number } => {
  let files = 0;
  let lines = 0;
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      const p = path.join(d, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (exts.some((e) => p.endsWith(e))) {
        files += 1;
        lines += readFileSync(p, "utf8").split("\n").length;
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return { files, lines };
};

mkdirSync(SCRATCH, { recursive: true });
mkdirSync(HEALTH_DIR, { recursive: true });
const vitestJson = path.join(SCRATCH, "vitest.json");

const gates: Gate[] = [
  run("format", "npm run format:check"),
  run("lint", "npm run lint"),
  run("typecheck", "npm run typecheck"),
  run(
    "tests",
    `npx vitest run --reporter=default --reporter=json --outputFile=${JSON.stringify(vitestJson)}`,
  ),
  run("fixture", `npx tsx scripts/validate-case.ts ${JSON.stringify(FIXTURE)}`),
  run("compositions", "npm run compositions"),
  run("bundle", "npm run build"),
];

let tests = { total: 0, passed: 0, failed: 0 };
if (existsSync(vitestJson)) {
  const j = JSON.parse(readFileSync(vitestJson, "utf8"));
  tests = {
    total: j.numTotalTests,
    passed: j.numPassedTests,
    failed: j.numFailedTests,
  };
}

const fixtureReport = validateRawWorkspace(readRawWorkspace(FIXTURE));
const manifest = fixtureReport.workspace?.manifest;
const src = countLines(path.join(ROOT, "src"), [".ts", ".tsx"]);
const testLoc = countLines(path.join(ROOT, "tests"), [".ts"]);
const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));

const snapshot = {
  date: new Date().toISOString(),
  version: pkg.version,
  remotion: pkg.dependencies.remotion,
  gates,
  allPassed: gates.every((g) => g.pass),
  tests,
  fixture: {
    errors: fixtureReport.counts.errors,
    warnings: fixtureReport.counts.warnings,
    durationSec: manifest
      ? Math.round(
          (manifest.render.durationInFrames / manifest.render.fps) * 10,
        ) / 10
      : null,
    shots: manifest?.shots.length ?? null,
  },
  codebase: {
    srcFiles: src.files,
    srcLines: src.lines,
    testFiles: testLoc.files,
    testLines: testLoc.lines,
  },
  totalGateSeconds:
    Math.round(gates.reduce((s, g) => s + g.seconds, 0) * 10) / 10,
};

writeFileSync(
  path.join(HEALTH_DIR, "latest.json"),
  `${JSON.stringify(snapshot, null, 2)}\n`,
);

if (!process.argv.includes("--no-log")) {
  const log = path.join(HEALTH_DIR, "HEALTH_LOG.md");
  if (!existsSync(log)) {
    writeFileSync(
      log,
      "# Health Log\n\nOne row per `npm run health`. Newest at the bottom. See `latest.json` for detail.\n\n" +
        "| Date (UTC) | Version | Gates | Tests | Fixture err/warn | Fixture length | src LOC | test LOC | Gate time |\n" +
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n",
    );
  }
  const gateSummary = snapshot.allPassed
    ? `all ${gates.length} pass`
    : `FAIL: ${gates
        .filter((g) => !g.pass)
        .map((g) => g.name)
        .join(", ")}`;
  appendFileSync(
    log,
    `| ${snapshot.date.slice(0, 16).replace("T", " ")} | ${snapshot.version} | ${gateSummary} | ${tests.passed}/${tests.total} | ` +
      `${snapshot.fixture.errors}/${snapshot.fixture.warnings} | ${snapshot.fixture.durationSec}s | ${src.lines} | ${testLoc.lines} | ${snapshot.totalGateSeconds}s |\n`,
  );
}

console.log(
  `\n${snapshot.allPassed ? "HEALTHY" : "UNHEALTHY"} — tests ${tests.passed}/${tests.total}, gates ${snapshot.totalGateSeconds}s`,
);
process.exit(snapshot.allPassed ? 0 : 1);
