# Agent Skills

## Two kinds of skills

| Kind                          | Where                                                    | Maintained by                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Official Remotion skills (12) | `.claude/skills/remotion-*`, `.agents/skills/remotion-*` | Remotion. Installed with `npx skills add remotion-dev/skills`; pinned in `skills-lock.json`. **Do not edit.** Update with `npx skills update`. |
| Project skills (13)           | `skills/<name>/SKILL.md` (source of truth)               | This repo. Copied to both agent folders by `npm run skills:sync`.                                                                              |

Official: `remotion-best-practices`, `remotion-create`, `remotion-markup`,
`remotion-studio`, `remotion-render`, `remotion-maps`, `remotion-captions`,
`remotion-saas`, `remotion-interactivity`, `remotion-docs`,
`remotion-upgrade`, `remotion-multimedia`. Project skills complement them;
`remotion-video` tells agents to load them for API guidance.

## The orchestrator

**`crime-documentary`** knows the stage order, prerequisites, outputs, gates,
validation, resume and failure behavior. It always starts with
`validate:case` + `pipeline status`, acts on the first non-KEEP stage, loads
the right stage skill, records stage transitions, and stops at every human
gate. It does no stage work itself and never resolves a gate.

## Stage skills

| Skill                  | Stage(s)                   | Purpose                                                          | Input                              | Output                                                    |
| ---------------------- | -------------------------- | ---------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------- |
| `case-research`        | RESEARCH                   | Sources + atomic claim ledger                                    | case.json                          | sources, claims (UNVERIFIED), entities, research.json/.md |
| `source-verification`  | VERIFICATION               | Evidence-based claim status; legal-status history                | sources, claims                    | claim statuses, legal statuses, contradictions            |
| `case-timeline`        | TIMELINE                   | Honest-precision chronology; requests Gate 1                     | verified claims                    | timeline.json                                             |
| `crime-story-director` | STORY                      | Structure without invention                                      | claims, timeline (+Gate 1)         | story-plan.json                                           |
| `crime-script-writer`  | SCRIPT                     | Claim-linked framed narration; requests Gate 2a                  | story plan, claims                 | script.json                                               |
| `narration`            | NARRATION, ALIGNMENT       | Local audio, measured, aligned                                   | approved script (+Gate 2a)         | narration.json, alignment.json, WAVs                      |
| `visual-director`      | VISUAL_BIBLE, VISUAL_PLAN  | Visual identity; shots + visual states timed to measured audio   | story, script, measured alignment  | visual-bible.json, visual-plan.json, manifest.json        |
| `asset-research`       | ASSETS                     | Free-first acquisition with provenance; selective retry          | visual plan (+Gate 2b)             | assets.json, media                                        |
| `remotion-video`       | RENDER, CAPTIONS           | Execute the manifest; clean master + caption files               | manifest, alignment, bible, assets | master.mp4, captions.srt/.ass, chapters, credits          |
| `video-qc`             | TECHNICAL_QA, EDITORIAL_QA | Technical / visual / editorial QA with explicit manual checks    | render + ledger                    | qa-report.json                                            |
| `youtube-package`      | PACKAGE                    | Accurate titles, description, chapters, thumbnail brief, credits | story, claims, manifest, QA        | youtube-package.json                                      |

Planned: `case-discovery`.

## Design rules

- **Small and composable.** One stage (or tightly coupled pair) per skill.
  No `make-youtube-video` mega-skill.
- **Independent.** Each restates its own non-negotiables.
- **Versioned.** `version:` in frontmatter; the five research/story skills
  are 1.1.0 (gate wiring added), new skills 1.0.0.
- **Testable.** `tests/skills.test.ts` checks every skill's frontmatter, six
  required sections, the validation gate, sync to both agent folders, and that
  the orchestrator references every stage skill and forbids resolving gates.
  The behavior skills describe is enforced in `src/validation` and
  `src/pipeline`, which have their own tests.
- **Humans own gates.** No skill approves, rejects, or answers a gate or a
  manual QA check.

## Adding a skill

1. `skills/<name>/SKILL.md` with `name`, `description`, `version`, and the six
   sections; end with `npm run validate:case`.
2. Add it to `PROJECT_SKILLS` in `tests/skills.test.ts`, to
   `skills/README.md`, and — if it owns a stage — to `STAGE_GRAPH` and the
   orchestrator's table.
3. `npm run skills:sync && npm test`.

`skills/` is excluded from Prettier: its Markdown emphasis rewriting
corrupted instruction text twice (e.g. `LEGAL_STATUS … _final_`).
