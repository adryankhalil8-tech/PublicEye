# Case workspaces

One directory per real case: `data/cases/<case-id>/`. Create one with:

```bash
npm run new:case -- <kebab-slug> "<Case name>"
npm run validate:case -- case-<kebab-slug>
```

| File                                                         | Written by                          | Contents                                                |
| ------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------- |
| `case.json`                                                  | `new:case`                          | Identity, jurisdiction, coarse stage, target duration   |
| `sources.json`                                               | case-research                       | Sources with authority level and metadata               |
| `claims.json`                                                | case-research → source-verification | Claim ledger: atomic claims, evidence, status           |
| `entities.json`                                              | case-research                       | People (legal-status history), orgs, places             |
| `research.json` / `research.md`                              | case-research                       | Summary, open questions, contradictions / human notes   |
| `timeline.json`                                              | case-timeline                       | Chronology with honest date precision                   |
| `story-plan.json`                                            | crime-story-director                | Angle, sequences, reveals, pacing                       |
| `script.json`                                                | crime-script-writer                 | Narration units linked to claims                        |
| `narration/narration.json`                                   | narration (`npm run narrate`)       | Takes, measured duration, provider                      |
| `narration/alignment.json`                                   | narration                           | Segments on the measured timeline + word times          |
| `visual-bible.json`                                          | visual-director                     | Locked visual anchors (revisioned)                      |
| `visual-plan.json`                                           | visual-director                     | Shots, visual states, asset requirements                |
| `assets.json`                                                | asset-research                      | Provenance, rights, approval, production status         |
| `manifest.json`                                              | `build:manifest`                    | Timed shots + states, narration, assets, QC summary     |
| `runs/<run-id>.json`                                         | `pipeline`, `gate`                  | Resumable run state, gates, failures, cost              |
| `output/qa-report.json`                                      | video-qc (`npm run qa`)             | Technical / visual / editorial QA                       |
| `output/youtube-package.json`                                | youtube-package                     | Titles, description, chapters, thumbnail brief, credits |
| `output/captions.srt`, `.ass`, `chapters.txt`, `credits.txt` | `deliverables`                      | Publishing files                                        |
| `output/master.mp4` (+ `master-captioned.mp4`)               | remotion-video                      | Renders (git-ignored)                                   |

Everything is plain JSON/Markdown so a human can read and review it in a
diff. The synthetic reference workspace lives in
`fixtures/cases/synthetic-tern-river-payroll/`.

Real-case research is committed. Media files are not (see `assets/README.md`).
