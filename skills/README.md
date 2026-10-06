# Project Agent Skills

Small, composable skills — one per pipeline stage — plus one orchestrator.
They complement the official Remotion skills (installed in
`.claude/skills/remotion-*` and `.agents/skills/remotion-*` via
`npx skills add remotion-dev/skills`).

**Source of truth is this folder.** After editing a skill, run:

```bash
npm run skills:sync   # copies skills/* into .claude/skills and .agents/skills
```

`tests/skills.test.ts` fails if a copy drifts or a skill is missing a
required section (PURPOSE, INPUTS, OUTPUTS, PROCESS, QUALITY RULES,
FAILURE CONDITIONS).

## Orchestrator

| Skill               | Role                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `crime-documentary` | Knows stage order, prerequisites, gates, resume and failure behavior; dispatches the stage skills below. Does no stage work itself. |

## Stage skills

| Skill                  | Version | Stage(s)                   | Reads                                       | Writes                                                  |
| ---------------------- | ------- | -------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| `case-research`        | 1.1.0   | RESEARCH                   | case.json                                   | sources, claims (UNVERIFIED), entities, research.json/.md |
| `source-verification`  | 1.1.0   | VERIFICATION               | sources, claims, entities                   | claim statuses, legal-status history, contradictions    |
| `case-timeline`        | 1.1.0   | TIMELINE                   | claims, sources, entities                   | timeline.json; requests RESEARCH gate                   |
| `crime-story-director` | 1.1.0   | STORY                      | claims, timeline, research (+ RESEARCH gate) | story-plan.json                                        |
| `crime-script-writer`  | 1.1.0   | SCRIPT                     | story-plan, claims, timeline                | script.json; requests SCRIPT gate                       |
| `narration`            | 1.0.0   | NARRATION, ALIGNMENT       | approved script (+ SCRIPT gate)             | narration/narration.json, narration/alignment.json, audio |
| `visual-director`      | 1.0.0   | VISUAL_BIBLE, VISUAL_PLAN  | story, script, measured alignment           | visual-bible.json, visual-plan.json, manifest.json      |
| `asset-research`       | 1.0.0   | ASSETS                     | visual plan (+ PRE_PRODUCTION gate)         | assets.json, media files                                |
| `remotion-video`       | 1.0.0   | RENDER, CAPTIONS           | manifest, alignment, bible, assets          | output/master.mp4, captions.srt/.ass, chapters, credits |
| `video-qc`             | 1.0.0   | TECHNICAL_QA, EDITORIAL_QA | render + full ledger                        | output/qa-report.json                                   |
| `youtube-package`      | 1.0.0   | PACKAGE                    | story, claims, manifest, QA                 | output/youtube-package.json                             |

Planned: `case-discovery` (candidate queue in `data/candidates/`).

Human gates (RESEARCH, SCRIPT, PRE_PRODUCTION, PUBLICATION) are resolved by
people with `npm run gate`, never by a skill.

Every skill ends with `npm run validate:case -- <case-id>` as its exit gate.
There is deliberately no "make-youtube-video" mega-skill.
