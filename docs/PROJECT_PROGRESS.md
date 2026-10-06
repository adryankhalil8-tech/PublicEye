# Project Progress

Living tracker for the crime documentary system. Update it at the end of
every sprint. Record changes in [`CHANGELOG.md`](../CHANGELOG.md) and
measured health in [`health/HEALTH_LOG.md`](health/HEALTH_LOG.md)
(`npm run health` appends a row).

**Current:** Phase 1 — Real Case Intelligence (in progress, 2026-10-06)
**Waiting on:** your Gate 1 review of Teapot Dome

## Roadmap

Phases renumbered on 2026-10-06 to the agreed plan (narration before visuals).

| Phase | Name                          | Status         | Summary                                                                                                              |
| ----- | ----------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| —     | Foundation & Architecture     | ✅ Complete    | Contracts, validation, gates, resumable runs, provenance, visual system, Remotion, QA, packaging (v0.2.0)            |
| 1     | Real Case Intelligence        | 🟦 In progress | Discovery → CourtListener → snapshots → claims → verification → timeline → **Gate 1** → story → script → **Gate 2a** |
| 2     | Publication-quality Narration | ⬜ Not started | Piper / voice-over import → measured narration → alignment → caption accuracy                                        |
| 3     | Real Visual Production        | ⬜ Not started | Visual bible → timed states → archival assets → court-document viewer → maps/timelines → rights → **Gate 2b**        |
| 4     | Full 5–10 Minute Production   | ⬜ Not started | Render → technical QA → editorial QA → captions → package → **Gate 3**                                               |
| 5     | Automation & Scale            | ⏸ Deferred     | Automatic runner, case queue, scheduling — not before Phases 1–4 prove out                                           |

## Phase 1 — Real Case Intelligence (in progress)

- [x] Freeze the working architecture (commit `046b408`, by you)
- [x] CourtListener client: cached, budget-enforced, verified live
- [x] Source snapshotting with SHA-256 (verified on a real opinion: 26,291 chars)
- [x] `case-discovery` skill + candidate records + human-only selection
- [x] Gate 1 review packet (excerpts checked against snapshots)
- [x] Three candidates proposed (`data/candidates/`)
- [x] **You selected Teapot Dome** (human:Adryan, 2026-10-06)
- [x] Research → verification → timeline (66 claims, 85/85 excerpts verified, 28 events)
- [x] **Gate 1 (RESEARCH)** — approved by human:Adryan
- [x] Story plan + script (51 units, ≈ 561 s estimated), read-aloud review in `output/script-review.md`
- [ ] **Gate 2a (SCRIPT)** — requested (`gate-script-1`); awaiting your review
- [ ] Phase 1 stops here — no visual planning, assets, or final narration

## Architecture Integration — success criteria

| Criterion                                               | Status | Evidence                                                                                                                                                                   |
| ------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing project preserved                              | ✅     | All 104 Phase-0 tests still pass (adapted only to renamed APIs); fixture extended, not replaced                                                                            |
| Current implementation audited                          | ✅     | Gap map in the sprint report; CHANGELOG 0.2.0                                                                                                                              |
| Duplicate architecture avoided                          | ✅     | `CaptionTrack` folded into `NarrationAlignment`; timed plan lives in the manifest (no separate shot-plan file); bible applied via CSS variables (no parallel theme system) |
| Modular skills preserved                                | ✅     | 5 original skills kept (v1.1.0, gate wiring only)                                                                                                                          |
| `crime-documentary` orchestration skill                 | ✅     | `skills/crime-documentary/SKILL.md`; test asserts it references every stage skill                                                                                          |
| Research claim ledger                                   | ✅     | Unchanged core (`CaseClaim`, `ClaimEvidence`, `CaseSource`)                                                                                                                |
| Source verification explicit                            | ✅     | VERIFICATION stage + `assessClaimSupport`                                                                                                                                  |
| Legal-status distinctions                               | ✅     | + SUSPECTED, ARRESTED; arrest wording rule                                                                                                                                 |
| Case timeline                                           | ✅     | Unchanged                                                                                                                                                                  |
| Narration before final visual planning                  | ✅     | Stage graph; VISUAL_PLAN blocked on ESTIMATED alignment; REVIEW/FINAL require AUDIO timing                                                                                 |
| Narration artifact contract                             | ✅     | `NarrationArtifact` with per-unit takes                                                                                                                                    |
| Alignment contract                                      | ✅     | `NarrationAlignment`, `NarrationSegment`                                                                                                                                   |
| CaseVisualBible                                         | ✅     | Contract, validation, fixture, renderer applies it                                                                                                                         |
| Visual states / beats represented                       | ✅     | 9 states; resolved to frames in the manifest; DIM/HIGHLIGHT rendered and inspected                                                                                         |
| Shots reference measured narration                      | ✅     | Fixture manifest `timingSource: AUDIO`, `PER_UNIT_SYNTHESIS`                                                                                                               |
| RunManifest                                             | ✅     | `src/domain/run.ts`; fixture `runs/run-20260930234930.json`                                                                                                                |
| Resumable stage state                                   | ✅     | `transitionStage`, `planResume`, `npm run pipeline`                                                                                                                        |
| Selective asset/item retry                              | ✅     | `planItems`; verified on real narration (nu-003 retried alone)                                                                                                             |
| Completed work not regenerated                          | ✅     | Narration no-op on rerun; input fingerprints → KEEP/RERUN                                                                                                                  |
| Three human approval gates                              | ✅     | RESEARCH, SCRIPT (2a) + PRE_PRODUCTION (2b), PUBLICATION; human-only, fingerprinted                                                                                        |
| Asset production status                                 | ✅     | status, attemptCount, lastError, timestamps, estimatedCostUsd                                                                                                              |
| Asset provenance / rights tracked                       | ✅     | Unchanged rules + REMOTION_GENERATED / USER_PROVIDED origins                                                                                                               |
| Free-first intact                                       | ✅     | No paid dependency; SAPI local narration                                                                                                                                   |
| Paid operations require explicit approval               | ✅     | `assertPaidOperationApproved` (env + human cost approval)                                                                                                                  |
| Remotion remains renderer                               | ✅     | Executes manifest; decides nothing editorial                                                                                                                               |
| Technical QA contract                                   | ✅     | `QaReport` + ffprobe/silencedetect; PASS on real render                                                                                                                    |
| Editorial / fact QA contract                            | ✅     | Automated re-checks + mandatory human review                                                                                                                               |
| Editable caption outputs                                | ✅     | captions.srt / captions.ass; master has no burned captions                                                                                                                 |
| `youtube-package` skill                                 | ✅     | Skill + contract + validation + fixture package                                                                                                                            |
| Synthetic fixture demonstrates architecture             | ✅     | Research → … → package, with real narration and render                                                                                                                     |
| Tests / TypeScript / lint / build / composition listing | ✅     | 214/214; all health gates pass                                                                                                                                             |

## Phase 0 — Definition of Done (2026-09-29)

All 23 items complete — see CHANGELOG 0.1.0. Notable evidence: Remotion
4.0.530 project, 12 official skills, full fixture render verified by ffprobe.

## Health snapshot (latest, 2026-09-30)

| Metric                                                                        | Value                                                                |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Quality gates (format, lint, typecheck, tests, fixture, compositions, bundle) | 7/7 pass                                                             |
| Tests                                                                         | 214 passing (11 files)                                               |
| Fixture validation                                                            | 0 errors / 2 warnings (both intentional)                             |
| Fixture length                                                                | 101.4 s measured narration (estimate was 109.1 s), 11 shots          |
| Fixture QA (real render)                                                      | All automated checks PASS; overall INCOMPLETE pending 4 human checks |
| Full gate run time                                                            | 42.1 s                                                               |

## Sprint log

| Date       | Sprint                                 | Outcome                                                                             |
| ---------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| 2026-09-29 | Sprint 0 — Foundation & Architecture   | Phase 0 complete. CHANGELOG 0.1.0.                                                  |
| 2026-09-30 | Architecture Integration               | Narration-first timing, run state, gates, QA, captions, packaging. CHANGELOG 0.2.0. |
| 2026-10-06 | Phase 1 (part 1) — tooling + discovery | CourtListener client, snapshots, candidates, review packet; 3 candidates proposed   |
