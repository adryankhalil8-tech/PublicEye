---
name: remotion-video
description: Project-specific Remotion work for the crime documentary pipeline — render the clean master and optional captioned derivative from the production manifest, write caption files, and extend primitives/adapters. Leverages the official remotion-* skills for API guidance. Remotion executes the plan; it never decides story, truth, or evidence.
version: 1.0.0
---

# remotion-video

## PURPOSE

Execute a validated plan in pixels and sound. Everything editorial was
decided upstream; this skill renders it faithfully.

## INPUTS

- `manifest.json` (timed shots + visual states; `timingSource: AUDIO` for
  REVIEW/FINAL), `narration/alignment.json`, `narration/narration.json`,
  `visual-bible.json`, `assets.json` (COMPLETE + APPROVED assets).
- An APPROVED, fresh `PRE_PRODUCTION` gate.
- Official guidance: load `remotion-best-practices` (and `remotion-render`,
  `remotion-captions`, `remotion-markup` as needed). Do not edit
  `remotion-*` skill folders.

## OUTPUTS

- `output/master.mp4` — canonical, **no burned captions**, narration audio.
- `output/master-captioned.mp4` — optional derivative.
- `output/captions.srt`, `output/captions.ass`, `output/chapters.txt`,
  `output/credits.txt` via `npm run deliverables -- <case>`.

## PROCESS

1. `npm run validate:case -- <case>` (zero errors) and
   `npm run pipeline -- status <case>` — RENDER must be RUN/RETRY (assets
   complete and approved, gate approved).
2. Render the master with `CaseVideo` props
   `{ "showCaptions": false, "withNarration": true }`
   (see `npm run render:fixture:master` for the pattern; a real case passes
   its workspace as `--props`).
3. `npm run deliverables -- <case>` for SRT/ASS/chapters/credits.
4. Optionally render the captioned derivative (`showCaptions: true`).
5. Hand off to `video-qc`.

When changing rendering code:

- ShotType → component mapping lives **only** in
  `src/remotion/adapters/scene-spec.ts`.
- Visual states arrive as frames in `manifest.shots[].states`; primitives
  animate from them with `useCurrentFrame()` + `interpolate()`. No CSS
  transitions.
- Theme tokens are CSS variables set from the visual bible
  (`visualBibleVariables`); primitives use `theme.*`, never raw hex.
- Every ILLUSTRATIVE scene shows `RepresentationLabel` for the whole shot.

## QUALITY RULES

- The master is clean; captions ship as editable files.
- Duration, resolution, and fps come from the manifest, never hard-coded.
- Typeset document excerpts say "not a facsimile"; maps say "not to scale".

## FAILURE CONDITIONS

Stop and report if:

- The manifest is DRAFT/ESTIMATED but a final render is requested.
- Validation reports MANIFEST_* or ASSET_* errors.
- A render fails 3 times — record failures in the run and investigate.

## NON-NEGOTIABLES

Remotion does not decide what the story is, whether a claim is true, which
evidence is trustworthy, or the narrative structure. If a render seems to
need such a decision, stop and send it back upstream.
