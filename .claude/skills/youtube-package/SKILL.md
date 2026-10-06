---
name: youtube-package
description: Draft YouTube publishing metadata for a finished case video — title candidates, description, chapters, tags, thumbnail brief, credits, source notes, publishing checklist — in output/youtube-package.json. Metadata is held to the script's factual rules; clickability never changes a claim. Does not upload.
version: 1.0.0
---

# youtube-package

## PURPOSE

Present the video honestly to viewers and the platform. SEO comes after
the content and never above it.

## INPUTS

- `story-plan.json`, `script.json`, `claims.json`, `sources.json`,
  `manifest.json` (measured timing), `assets.json`.
- `output/chapters.txt` and `output/credits.txt` from
  `npm run deliverables -- <case>`.
- `output/qa-report.json`.

## OUTPUTS

- `output/youtube-package.json` (`YouTubePackage`, status DRAFT).

## PROCESS

1. Run `npm run deliverables -- <case>`; copy chapters and credits exactly.
2. Draft 2–4 **title candidates**, each with the `claimIds` it relies on.
   Accurate first; specific beats sensational.
3. Write the **description**: what the video covers, attributed language for
   allegations, the legal outcome, sources, credits, and labels for any
   illustrations. Cite its claims.
4. **Thumbnail brief**: concept, optional text overlay, imagery rules, and
   `mustNotImply` — at minimum, any implication that contradicts a legal
   outcome (e.g. "must not imply the acquitted defendant is guilty").
5. Tags only where useful; no misleading names.
6. Publishing checklist, all `done: false` until a human completes them.
7. `npm run validate:case -- <case>` — zero errors.

## QUALITY RULES

- Legal words ("convicted", "charged", "acquitted"…) in metadata need a
  cited SUPPORTED legal-status claim; guilt labels are errors.
- No claim stronger than the video makes. No UNVERIFIED claims.
- Chapters: first at 0:00, ≥3, each ≥10 s, ascending (YouTube's rules).
- Synthetic fixtures say they are fictional.

## FAILURE CONDITIONS

Stop and report if QA is FAIL, if a required credit is unknown, or if no
accurate title can be written without overstating the record.

## NON-NEGOTIABLES

Do not alter facts for clickability. Do not upload or schedule anything;
publication requires the human PUBLICATION gate.
