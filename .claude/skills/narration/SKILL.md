---
name: narration
description: Produce, measure, and align narration audio for an approved case script using a free/local provider (Windows SAPI now; Piper/human voice-over planned). Writes narration/narration.json and narration/alignment.json. Use after the SCRIPT gate is approved and before visual planning — shots are timed to this measured audio.
version: 1.0.0
---

# narration

## PURPOSE

Turn the approved script into real audio and a measured timeline. Visual
timing is built on this, never on word-count estimates.

## INPUTS

- `script.json` with zero validation errors.
- An APPROVED, fresh `SCRIPT` gate in the latest `runs/<run-id>.json`.
- A provider. Default: `system-sapi` (LOCAL, free). Paid providers only with
  `ALLOW_PAID_PROVIDERS=true` **and** a human-approved cost approval in the
  run (`assertPaidOperationApproved`).

## OUTPUTS

- `assets/audio/<case-id>/units/<unit-id>.wav` — one take per unit (git-ignored).
- `assets/audio/<case-id>/narration.wav` — joined track with scripted pauses.
- `narration/narration.json` — `NarrationArtifact`: per-unit take status,
  attempts, errors, script fingerprint, measured duration, provider.
- `narration/alignment.json` — `NarrationAlignment`: one segment per unit on
  the measured timeline (`PER_UNIT_SYNTHESIS`), plus interpolated word times.

## PROCESS

1. `npm run pipeline -- status <case>` — confirm NARRATION is RUN or RETRY.
2. `npm run narrate -- <case> [--voice="Microsoft David Desktop"]`.
   - Completed takes with unchanged text are kept.
   - Failed takes are retried (max 3 attempts); exhausted takes stop the run.
   - When every take is COMPLETE, takes are joined with each unit's
     `pauseAfterSec` as real silence, the file is measured from its header,
     and an exact per-unit alignment is written.
3. If the script is not approved yet and timing is needed for exploration,
   `--draft` produces narration marked `producedFromApprovedScript: false`.
   It can never time a REVIEW/FINAL manifest.
4. Listen to the narration. Pronunciation of names, places, and legal terms
   is part of the PRE_PRODUCTION gate.
5. `npm run validate:case -- <case>` — zero errors.

## QUALITY RULES

- Durations are measured from audio files, never estimated.
- Segment text must equal the verified script text (`ALIGNMENT_TEXT_MISMATCH`).
  If a future aligner (whisper.cpp) is used, it aligns the known text — it
  does not re-transcribe and replace it.
- Any script edit after narration makes the affected takes stale; only those
  are re-voiced.
- Machine voices are for drafts and fixtures. Publication narration uses a
  quality local voice (Piper) or a human, recorded per voice license.

## FAILURE CONDITIONS

Stop and report if:

- The SCRIPT gate is not APPROVED (unless explicitly doing `--draft` work).
- A take fails 3 times (`exhausted`) — investigate the text or provider.
- The provider is unavailable on this machine.
- Validation reports NARRATION_* or ALIGNMENT_* errors.

## NON-NEGOTIABLES

Never change script wording during narration — wording changes go back
through the script gate. Never use a paid provider without explicit human
cost approval.
