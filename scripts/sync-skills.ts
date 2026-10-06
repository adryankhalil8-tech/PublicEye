/**
 * Copy project skills (skills/<name>/) into the agent discovery folders:
 *   .claude/skills/<name>/  (Claude Code)
 *   .agents/skills/<name>/  (Codex and other agents)
 *
 *   npm run skills:sync
 *
 * Official Remotion skills in those folders are left untouched.
 */
import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/workspace-fs";

export const SKILLS_SRC = path.join(ROOT, "skills");
export const SKILL_TARGETS = [
  path.join(ROOT, ".claude", "skills"),
  path.join(ROOT, ".agents", "skills"),
];

export const projectSkillNames = () =>
  readdirSync(SKILLS_SRC).filter((n) =>
    statSync(path.join(SKILLS_SRC, n)).isDirectory(),
  );

const main = () => {
  for (const name of projectSkillNames()) {
    for (const target of SKILL_TARGETS) {
      const dest = path.join(target, name);
      if (existsSync(dest)) rmSync(dest, { recursive: true });
      cpSync(path.join(SKILLS_SRC, name), dest, { recursive: true });
    }
    console.log(`synced ${name}`);
  }
};

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
)
  main();
