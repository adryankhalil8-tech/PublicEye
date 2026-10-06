import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  OUTPUT_FILES,
  WORKSPACE_DIRS,
  WORKSPACE_FILES,
  type CaseWorkspace,
  type RawWorkspace,
  type RunManifest,
} from "../../src/domain";
import { deserializeRun, serializeRun } from "../../src/pipeline/run";
import {
  validateRawWorkspace,
  type ValidationReport,
} from "../../src/validation";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const CASES_DIR = path.join(ROOT, "data", "cases");
export const ASSETS_DIR = path.join(ROOT, "assets");

/**
 * Accepts a case ID ("case-foo" → data/cases/case-foo) or a directory path.
 */
export const resolveCaseDir = (arg: string): string => {
  const direct = path.resolve(ROOT, arg);
  if (existsSync(path.join(direct, WORKSPACE_FILES.case))) return direct;
  const byId = path.join(CASES_DIR, arg);
  if (existsSync(path.join(byId, WORKSPACE_FILES.case))) return byId;
  throw new Error(
    `No case workspace found at "${arg}" (looked in ${direct} and ${byId})`,
  );
};

export const keyToFile = (key: keyof CaseWorkspace) =>
  key === "project" ? WORKSPACE_FILES.case : WORKSPACE_FILES[key];

const KEYS: (keyof CaseWorkspace)[] = [
  "project",
  "sources",
  "claims",
  "entities",
  "timeline",
  "research",
  "story",
  "script",
  "narration",
  "alignment",
  "visualBible",
  "visualPlan",
  "assets",
  "manifest",
  "qaReport",
  "youtubePackage",
];

export const readRawWorkspace = (dir: string): RawWorkspace => {
  const raw: RawWorkspace = {};
  for (const key of KEYS) {
    const file = path.join(dir, keyToFile(key));
    if (!existsSync(file)) continue;
    try {
      raw[key] = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      throw new Error(`Invalid JSON in ${file}: ${(err as Error).message}`);
    }
  }
  return raw;
};

/** Parse + validate a workspace directory. */
export const loadWorkspace = (dir: string): ValidationReport =>
  validateRawWorkspace(readRawWorkspace(dir));

export const writeJson = (file: string, value: unknown) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

export const writeText = (file: string, text: string) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text, "utf8");
};

// ---------------------------------------------------------------------------
// Runs: runs/<run-id>.json
// ---------------------------------------------------------------------------

export const runsDir = (dir: string) => path.join(dir, WORKSPACE_DIRS.runs);

export const listRuns = (dir: string): RunManifest[] => {
  const d = runsDir(dir);
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .filter((f) => f.endsWith(".json"))
    .map((f) => deserializeRun(readFileSync(path.join(d, f), "utf8")))
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
};

export const latestRun = (dir: string): RunManifest | undefined =>
  listRuns(dir).at(-1);

export const writeRun = (dir: string, run: RunManifest) => {
  const file = path.join(runsDir(dir), `${run.runId}.json`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, serializeRun(run), "utf8");
  return file;
};

/** Workspace-relative output paths that exist on disk (render, captions…). */
export const existingOutputs = (dir: string): Set<string> =>
  new Set(
    Object.values(OUTPUT_FILES).filter((p) => existsSync(path.join(dir, p))),
  );

export const flag = (args: string[], name: string) => {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : "true";
};
