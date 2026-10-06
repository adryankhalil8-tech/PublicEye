---
name: crime-documentary
description: Master orchestrator for producing one crime/court documentary case end to end. Knows stage order, prerequisites, outputs, human gates, validation, resume, and failure behavior, and dispatches the right sub-skill. Use when asked to "produce", "continue", or "resume" a case. It does not do sub-skills' work itself.
version: 1.1.0
---

# crime-documentary (orchestrator)

## PURPOSE

Move a case through the pipeline safely and resumably: run the next stage
that is ready, stop at every human gate, never redo finished work, and never
skip a prerequisite.

## INPUTS

- A case workspace `data/cases/<case-id>/` (or `npm run new:case`).
- Its latest run: `runs/<run-id>.json` (`npm run pipeline -- init <case>`).

## OUTPUTS

- Advanced run state (stage statuses, failures, requested gates).
- Whatever the dispatched sub-skill produces.
- A short status report to the human: what ran, what is waiting, why.

## PROCESS

**Before a case exists:** run the `case-discovery` skill, present the
candidates, and STOP. A human selects one
(`npm run candidate -- select <cand-id> --by="human:<name>"`); then scaffold
it with `npm run new:case` and `npm run pipeline -- init`.

**Before requesting Gate 1:** run `npm run review-packet -- <case>` and point
the human to `output/review-packet.md`.

Always start with:

```bash
npm run validate:case -- <case>
npm run pipeline -- status <case>
```

Then act on the FIRST stage that is not KEEP:

| Action | Do this |
| --- | --- |
| KEEP | Nothing. Never regenerate it. |
| RUN | Mark READY→RUNNING, run the stage's skill, validate, mark COMPLETE (or FAILED with the error). |
| RETRY | Same as RUN; for item stages, retry only failed items. |
| RERUN | Inputs changed (stale). Re-run the stage; downstream stages follow. |
| WAIT_FOR_HUMAN | Request the gate if missing (`npm run gate -- request`), show its checklist, and STOP. |
| BLOCKED | Report the reasons. Fix the upstream cause; do not work around it. |

Stage → skill:

| Stage | Skill | Gate before it |
| --- | --- | --- |
| RESEARCH | case-research | — |
| VERIFICATION | source-verification | — |
| TIMELINE | case-timeline | — |
| GATE_RESEARCH | **human** (Gate 1) | — |
| STORY | crime-story-director | RESEARCH |
| SCRIPT | crime-script-writer | RESEARCH |
| GATE_SCRIPT | **human** (Gate 2a) | RESEARCH |
| NARRATION, ALIGNMENT | narration | SCRIPT |
| VISUAL_BIBLE, VISUAL_PLAN | visual-director | SCRIPT (plan needs measured alignment) |
| GATE_PRE_PRODUCTION | **human** (Gate 2b) | SCRIPT |
| ASSETS | asset-research | PRE_PRODUCTION |
| RENDER, CAPTIONS | remotion-video | PRE_PRODUCTION |
| TECHNICAL_QA, EDITORIAL_QA | video-qc | PRE_PRODUCTION |
| PACKAGE | youtube-package | PRE_PRODUCTION |
| GATE_PUBLICATION | **human** (Gate 3) | PRE_PRODUCTION |

Record progress with
`npm run pipeline -- mark <case> <STAGE> <READY|RUNNING|COMPLETE|FAILED> [--error="…"]`.
COMPLETE stores the stage's input fingerprint so later edits are detected.

Failure behavior: a failed stage is retried at most 3 times
(`maxAttempts`), then BLOCKED for a human. Item-level work (narration takes,
assets) keeps COMPLETE items and retries only FAILED ones.

Paid operations: never, unless `ALLOW_PAID_PROVIDERS=true` and a human has
approved a cost approval listing the exact jobs and estimate.

## QUALITY RULES

- One stage at a time; validate after each.
- Do not duplicate sub-skill instructions — load the sub-skill.
- Tell the human exactly which gate is waiting and what to review.
- Publishing is manual; this skill stops at the PUBLICATION gate.

## FAILURE CONDITIONS

Stop and report when a gate is pending, a stage is BLOCKED, retries are
exhausted, validation errors persist, or a paid operation would be needed.

## NON-NEGOTIABLES

Never approve, reject, or answer a gate. Never mark QA complete over failed
checks. Never let a stage continue on invalid prerequisites. Never fabricate
facts to unblock a stage.

Gate commands for the human (`npm run gate -- approve … --by="human:<name>"`)
are listed in docs/ARCHITECTURE.md#approval-gates. Run
`npm run validate:case -- <case>` after every stage.
