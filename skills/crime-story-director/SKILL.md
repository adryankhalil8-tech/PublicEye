---
name: crime-story-director
description: Turn verified research and the case timeline into a documentary StoryPlan (story-plan.json) for a 5–10 minute faceless YouTube video — angle, hook, sequences, reveals, pacing, ending. Use after case-timeline and before crime-script-writer. Creates tension through structure, never through invented facts. Renderer-independent.
version: 1.1.0
---

# crime-story-director

## PURPOSE

Decide how the verified story is told: what the viewer learns, in what
order, and why they keep watching. The Story Director arranges facts; it
never adds them.

## INPUTS

- `claims.json` (verified), `timeline.json`, `research.json`,
  `entities.json`, `case.json` (`targetDurationSec`).
- Contract: `src/domain/story.ts`.
- An APPROVED, fresh `RESEARCH` gate in the latest run (Gate 1). Without
  it the story may be drafted but not finalized.

## OUTPUTS

- `story-plan.json` (`StoryPlan`): `angle` (+ `alternativeAngles`), `hook`,
  `centralQuestion`, `narrativeArc`, `sequences` with beats, `reveals`,
  `pacing`, `emotionalProgression`, `endingStrategy`.

## PROCESS

1. **Propose 2–3 angles** (`StoryAngle`): logline, central question, why it
   works, `requiredClaimIds`, risks. Pick one; keep the rest as alternatives.
   An angle whose required claims are not SUPPORTED is not viable.
2. **Choose the hook** (`COLD_OPEN_EVENT`, `OUTCOME_FIRST`,
   `CENTRAL_QUESTION`, `CONTRAST`, `DOCUMENT_DETAIL`). Hook claims must be
   SUPPORTED. A strong document detail beats a rhetorical question.
3. **Build the arc** from the section vocabulary: HOOK, SETUP, BACKGROUND,
   INCITING_EVENT, INVESTIGATION, EVIDENCE, TURNING_POINT, COURT_CASE,
   VERDICT_OUTCOME, AFTERMATH, UNRESOLVED_QUESTIONS, ENDING. Use only what
   the case needs.
4. **Write sequences** with a purpose and beats. Every beat that asserts
   something links `claimIds` and/or `eventIds`.
5. **Plan reveals**: information held back and delivered later. Setup
   sequence must precede payoff. Reveals must deliver SUPPORTED (or openly
   DISPUTED) claims.
6. **Pace it**: per-sequence `targetDurationSec` summing to about
   `pacing.targetTotalSec` (within 10%) and to the case's target (300–600s).
   Give heavy sections room; do not front-load background.
7. **Emotional progression**: tone + intensity per sequence. Vary it;
   constant maximum intensity is fatigue, not tension.
8. **Ending**: RESOLUTION, OPEN_QUESTION, AFTERMATH, or REFLECTION — honest
   about what is and is not known.
9. Run `npm run validate:case -- <case-id>`.

## Legitimate tension tools

Information order · the central question · reveals · contrast (what police
believed vs. what the court found) · pacing · foreshadowing with real
details · rearranging the timeline (e.g. outcome first) while keeping dates
accurate.

## QUALITY RULES

- The plan must be tellable with SUPPORTED claims alone; DISPUTED /
  INSUFFICIENT_EVIDENCE material appears only as explicitly uncertain.
- Named people who were not convicted are never framed as the answer.
- Victims are people, not plot devices; avoid gratuitous violent detail.
- The plan names no React components, fonts, or effects — that is the
  Remotion layer's job.

## FAILURE CONDITIONS

Stop and report if:

- No angle can be supported by verified claims.
- The only compelling angle depends on a DISPUTED or UNVERIFIED claim being
  true.
- The verified material cannot fill 5 minutes without padding (recommend a
  shorter format or a different case).

## NON-NEGOTIABLES

Structure may be dramatic. Facts may not be fabricated for drama: no invented
events, motives, dialogue, thoughts, evidence, or timelines.
