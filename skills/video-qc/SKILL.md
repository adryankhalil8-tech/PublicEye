---
name: video-qc
description: Quality-check a rendered case video in three categories — technical (ffprobe, silence detection), visual, and editorial/fact — writing output/qa-report.json. Automated checks never replace human review; anything a machine cannot judge is MANUAL_REQUIRED. Use after the master is rendered and before packaging/publication.
version: 1.0.0
---

# video-qc

## PURPOSE

Catch technical faults, visual problems, and factual drift before anyone
publishes — and be explicit about what still needs a human.

## INPUTS

- `output/master.mp4`, `manifest.json`, `narration/*`, `assets.json`,
  `visual-bible.json`, and the full research/claim ledger.

## OUTPUTS

- `output/qa-report.json` (`QaReport`): checks with category, status
  (PASS/WARN/FAIL/NOT_RUN/MANUAL_REQUIRED), `automated`, detail, and
  `reviewedBy` for human-resolved checks; `overall` PASS/FAIL/INCOMPLETE.

## PROCESS

1. `npm run qa -- <case>` runs automated checks:
   - **Technical:** render exists, duration vs manifest, resolution, fps,
     codec, file size, audio present, audio covers narration, unexpected
     silence (> 4 s), all manifest assets produced, captions fit.
   - **Visual:** shot-type repetition/overuse, placeholders, reconstruction
     labels, bible revision consistency.
   - **Editorial:** script claims still supported, legal statuses, quotes,
     dates, visuals vs evidence, attribution, captions match the script.
2. Human checks (MANUAL_REQUIRED): composition/cropping, document
   legibility at 1080p, safe areas, and a full editorial watch-through
   against the claim ledger. The reviewer records PASS/FAIL with
   `reviewedBy: "human:<name>"`.
3. Fix FAILs upstream (never by editing the report), re-render, re-run QA.
4. `npm run validate:case -- <case>` — the report's `overall` must match its
   checks (`QA_OVERALL_INCONSISTENT`).

## QUALITY RULES

- `overall` is computed, not chosen: any FAIL → FAIL; any NOT_RUN or
  unresolved MANUAL_REQUIRED → INCOMPLETE.
- Agents never mark a manual check as reviewed.
- A FINAL manifest requires `overall: PASS`.

## FAILURE CONDITIONS

Stop and report if any check FAILs, or if a required probe (ffprobe,
silence detection) cannot run.

## NON-NEGOTIABLES

Do not pretend automated QA replaces human editorial review. Do not mark QA
complete when checks failed.
