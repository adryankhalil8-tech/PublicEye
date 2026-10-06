# Project Progress

Living tracker for the crime documentary system. Update it at the end of
every sprint. Record changes in [`CHANGELOG.md`](../CHANGELOG.md) and
measured health in [`health/HEALTH_LOG.md`](health/HEALTH_LOG.md)
(`npm run health` appends a row).

**Current:** Architecture Integration sprint — COMPLETE (2026-09-30)
**Next:** Phase 1 — first real case through Research → Gate 1 → Script → Gate 2a (not started)

## Roadmap

| Phase | Name                         | Status                      | Summary                                                                                                   |
| ----- | ---------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| 0     | Foundation                   | ✅ Complete                 | Contracts, validation, skills, Remotion primitives, synthetic fixture                                     |
| 0.5   | Architecture Integration     | ✅ Complete                 | Narration-first timing, visual bible + states, resumable runs, human gates, QA, captions, YouTube package |
| 1     | Research & Story Engine      | ⬜ Not started              | First real case researched, verified, timelined, planned, scripted, through Gates 1 and 2a                |
| 2     | Visual / Remotion Engine     | 🟨 Architecture only        | Skills/contracts exist; still need real maps, scan viewer, bundled fonts, archival assets                 |
| 3     | Narration / Audio / Captions | 🟨 Local path works (draft) | SAPI + measured per-unit alignment + SRT/ASS done; need Piper/human voice, whisper.cpp, music/SFX         |
| 4     | End-to-End Case Production   | 🟨 Architecture only        | QA, gates, packaging exist; no real case has been produced                                                |
| 5     | Automation & Scaling         | ⬜ Not started              | Discovery queue, batch runs, possibly a database                                                          |

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

## Phase 1 — Research & Story Engine (next)

Goal: one real, well-documented case from candidate to an approved script.

- [ ] Choose the benchmark case (closed, historical, PRIMARY records available, no minors, no living unconvicted private individuals)
- [ ] `case-discovery` skill + `data/candidates/` queue (contract exists)
- [ ] CourtListener client (free token, rate-limited, cached) behind a provider interface
- [ ] Source snapshotting (archived URL / local PDF) for citations
- [ ] case-research → source-verification → case-timeline on the real case
- [ ] **Human Gate 1 (RESEARCH)** — approved by you
- [ ] Story plan + script at 5–10 min, 0 errors
- [ ] **Human Gate 2a (SCRIPT)** — approved by you
- [ ] Re-tune style lint and the drafting duration estimate against measured narration

## Phase 2 — Visual / Remotion Engine

- [x] `visual-director`, `asset-research`, `remotion-video` skills (architecture)
- [x] Visual bible + visual states + measured timing
- [ ] Real map rendering (MapLibre + permissive tiles; not the OSM public tile server)
- [ ] Scan viewer for real document images with region highlights (MOVE_TO / HIGHLIGHT on scans)
- [ ] Bundled local fonts (`typography.localFontFiles`)
- [ ] Per-primitive visual regression stills

## Phase 3 — Narration / Audio / Captions

- [x] Local narration provider (Windows SAPI), measured, per-unit alignment, selective retry
- [x] Audio-timed manifest; SRT/ASS caption outputs
- [ ] Publication-quality voice: Piper provider (voice licenses recorded) or human voice-over import
- [ ] whisper.cpp forced alignment for word-level timing on human recordings
- [ ] Music/SFX asset records (YouTube Audio Library, Freesound CC0/CC-BY)

## Phase 4 — End-to-End Case Production

- [x] `video-qc` skill + QA report; `youtube-package` skill; publication gate
- [ ] Human manual-QA workflow (CLI to record MANUAL_REQUIRED results)
- [ ] First real video rendered at FINAL stage through all four gates

## Phase 5 — Automation & Scaling

- [x] Orchestrator skill (thin, stage-gated)
- [ ] Batch validation / reporting across cases
- [ ] Evaluate a database only if cross-case queries require it

## Sprint log

| Date       | Sprint                               | Outcome                                                                             |
| ---------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| 2026-09-29 | Sprint 0 — Foundation & Architecture | Phase 0 complete. CHANGELOG 0.1.0.                                                  |
| 2026-09-30 | Architecture Integration             | Narration-first timing, run state, gates, QA, captions, packaging. CHANGELOG 0.2.0. |
