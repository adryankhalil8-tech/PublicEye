---
name: visual-director
description: Establish a case's visual bible (visual-bible.json), then plan shots and visual states (visual-plan.json) timed to MEASURED narration, and build the production manifest. Renderer-independent — describes visual intent, never React components. Use after narration/alignment exist and before asset acquisition.
version: 1.0.0
---

# visual-director

## PURPOSE

Decide what the viewer sees and when, so every visual serves understanding
of verified facts, in a consistent identity, synchronized to real narration.

## INPUTS

- `story-plan.json`, `script.json`, `claims.json`, `sources.json`.
- `narration/narration.json` (MEASURED) and `narration/alignment.json`
  (measured source — not ESTIMATED) for final timing.
- Contracts: `src/domain/visual-bible.ts`, `src/domain/visual.ts`.

## OUTPUTS

- `visual-bible.json` (`CaseVisualBible`) — locked anchors, with `revision`.
- `visual-plan.json` (`VisualPlan`) — shots, visual states, on-screen text,
  citations, asset requirements, `visualBibleRevision`.
- `manifest.json` via `npm run build:manifest -- <case>` — timed shots and
  states resolved to frames.

## PROCESS

1. **Visual bible first.** Start from the house defaults (palette, type,
   treatments, negative constraints in `DEFAULT_NEGATIVE_CONSTRAINTS`).
   Adjust only for reasons in the case (era, record types). Bump `revision`
   on every change; a revised bible makes the plan and manifest stale.
2. **Shots.** One shot per visual idea. For each: `shotType`,
   `visualIntent` (what the viewer must understand), `representation`
   (AUTHENTIC / GRAPHIC / ILLUSTRATIVE+label), `narrationIds`,
   `onScreenText` with claim links, `citationSourceIds`.
3. **Visual states, not slides.** Within a shot, add `beats` with a
   `state` (ESTABLISH, MOVE_TO, HIGHLIGHT, DIM_OTHERS, ANNOTATE, REVEAL,
   COMPARE, HOLD, HANDOFF) anchored to a narration unit plus offset. Change
   state when the viewer needs new information, emphasis, spatial context,
   a reveal, or a comparison. Do not change on a fixed clock. Documents,
   maps, and evidence diagrams may hold long while states evolve.
4. **Timing.** Shots are cut where their first narration segment starts on
   the measured audio; pauses stay inside shots. Do not set `durationSec`
   (ignored). Every state must land inside its shot
   (`BEAT_OUTSIDE_SHOT_DURATION`).
5. **Asset requirements.** Describe needs (`mustBeAuthentic` when only a real
   record will do). The asset-research skill fulfils them.
6. `npm run build:manifest -- <case>`, then `npm run validate:case`.
7. Request the PRE_PRODUCTION gate (`npm run gate -- request <case>
   PRE_PRODUCTION`). A human approves; you do not.

## QUALITY RULES

- Intent, not components: "show the distance between courthouse and scene",
  never "use AnimatedCrimeMap".
- Every name, date, quote, or location on screen links to a SUPPORTED claim.
- Reconstructions and illustrations are ILLUSTRATIVE with a label; generated
  media is never AUTHENTIC.
- Restraint: no police-light flashing, tape, gore, fingerprint clichés,
  neon, glass cards, particles, fake headlines, or fake documents.

## FAILURE CONDITIONS

Stop and report if:

- Alignment is ESTIMATED or narration is not MEASURED (draft layout only).
- A shot needs authentic material that likely does not exist or cannot be
  cleared — redesign the shot instead of faking it.
- Validation reports errors in the visual plan, bible, or manifest.

## NON-NEGOTIABLES

Never visually imply generated or illustrative material is authentic
evidence. Never put an unverified fact on screen.
