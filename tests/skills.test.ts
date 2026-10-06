import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  projectSkillNames,
  SKILL_TARGETS,
  SKILLS_SRC,
} from "../scripts/sync-skills";

const REQUIRED_SECTIONS = [
  "PURPOSE",
  "INPUTS",
  "OUTPUTS",
  "PROCESS",
  "QUALITY RULES",
  "FAILURE CONDITIONS",
];
const PROJECT_SKILLS = [
  "case-discovery",
  "case-research",
  "source-verification",
  "case-timeline",
  "crime-story-director",
  "crime-script-writer",
  "narration",
  "visual-director",
  "asset-research",
  "remotion-video",
  "video-qc",
  "youtube-package",
  "crime-documentary",
];
const OFFICIAL_REMOTION = [
  "remotion-best-practices",
  "remotion-captions",
  "remotion-create",
  "remotion-render",
  "remotion-studio",
];

describe("project skills", () => {
  it("includes every pipeline skill plus the orchestrator", () => {
    expect(projectSkillNames().sort()).toEqual([...PROJECT_SKILLS].sort());
  });

  it("the orchestrator dispatches to every stage skill without being one", () => {
    const md = readFileSync(
      path.join(SKILLS_SRC, "crime-documentary", "SKILL.md"),
      "utf8",
    );
    for (const name of PROJECT_SKILLS.filter(
      (n) => n !== "crime-documentary",
    )) {
      expect(md, name).toContain(name);
    }
    expect(md).toMatch(/Never approve, reject, or answer a gate/);
  });

  for (const name of PROJECT_SKILLS) {
    describe(name, () => {
      const md = readFileSync(path.join(SKILLS_SRC, name, "SKILL.md"), "utf8");

      it("has frontmatter with matching name, a description and a version", () => {
        const fm = md.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
        expect(fm).toMatch(new RegExp(`^name: ${name}$`, "m"));
        expect(fm).toMatch(/^description: .{40,}$/m);
        expect(fm).toMatch(/^version: \d+\.\d+\.\d+$/m);
      });

      it("documents every required section", () => {
        for (const s of REQUIRED_SECTIONS)
          expect(md, s).toMatch(new RegExp(`^## ${s}$`, "m"));
      });

      it("ends with the validation gate", () => {
        expect(md).toContain("npm run validate:case");
      });

      it("is synced to every agent folder", () => {
        for (const target of SKILL_TARGETS) {
          const copy = path.join(target, name, "SKILL.md");
          expect(
            existsSync(copy),
            `${copy} missing — run npm run skills:sync`,
          ).toBe(true);
          expect(
            readFileSync(copy, "utf8"),
            `${copy} is stale — run npm run skills:sync`,
          ).toBe(md);
        }
      });
    });
  }
});

describe("official Remotion skills", () => {
  it("are installed for Claude Code and Codex", () => {
    for (const target of SKILL_TARGETS) {
      for (const name of OFFICIAL_REMOTION)
        expect(
          existsSync(path.join(target, name, "SKILL.md")),
          `${target}/${name}`,
        ).toBe(true);
    }
  });
});
