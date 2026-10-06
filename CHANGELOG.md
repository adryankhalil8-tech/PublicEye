# Changelog

All notable changes to this project. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[SemVer](https://semver.org/). Schema changes are called out explicitly
because they affect every case workspace.

Progress by phase: [docs/PROJECT_PROGRESS.md](docs/PROJECT_PROGRESS.md) ·
Measured health over time: [docs/health/HEALTH_LOG.md](docs/health/HEALTH_LOG.md)

## [Unreleased]

_Nothing yet. Phase 1 has not started._

## [0.2.0] — 2026-09-30 — Architecture Integration

### Changed (pipeline order)

- **Narration now precedes final visual planning.** Shots and visual states
  are timed to measured narration; word-count estimates are drafting-only.
  `computeShotTimings` cuts shots at segment start times on the absolute
  audio timeline (pauses stay inside shots; no rounding drift). REVIEW/FINAL
  manifests must be AUDIO-timed from narration made after the SCRIPT gate.
- `CASE_STAGES` reordered (NARRATION before VISUAL_PLAN; PACKAGE added).

### Added

- **Narration**: `NarrationArtifact`, `NarrationSegment`,
  `NarrationAlignment`; WAV measurement/joining (`src/production/wav.ts`);
  `SystemNarrationProvider` (Windows SAPI, local, free); `npm run narrate`
  with per-unit idempotency, selective retry, staleness detection, `--draft`.
- **Run state**: `RunManifest` (`runs/<run-id>.json`) with stage statuses
  PENDING/READY/RUNNING/COMPLETE/FAILED/BLOCKED/SKIPPED/NEEDS_REVIEW,
  attempts, failures, artifacts (VALID/STALE/FAILED/MISSING), gates, cost.
  Stage graph (`src/pipeline/stages.ts`), enforced transitions, resume
  planner, item-level retry, content fingerprints. `npm run pipeline`.
- **Human gates**: `ApprovalGate` — RESEARCH, SCRIPT, PRE_PRODUCTION,
  PUBLICATION; human-only resolution, checklists, fingerprinted subjects
  (stale on change). `npm run gate`.
- **Cost gate**: `CostApproval`, `assertPaidOperationApproved` (env opt-in
  AND human-approved jobs/estimate); `AssetRecord.estimatedCostUsd`.
- **Visual**: `CaseVisualBible` (revisioned; renderer applies it via CSS
  variables); visual states on `SceneBeat` (ESTABLISH, MOVE_TO, HIGHLIGHT,
  DIM_OTHERS, ANNOTATE, REVEAL, COMPARE, HOLD, HANDOFF) resolved to frames in
  the manifest; DIM_OTHERS rendering in `DocumentViewer`.
- **Assets**: production status (status, attemptCount, lastError,
  timestamps), shotId, origins REMOTION_GENERATED / USER_PROVIDED / OTHER.
- **Legal statuses**: SUSPECTED, ARRESTED; "was arrested" wording rule.
- **QA**: `QaReport` — technical (ffprobe + silencedetect), visual, and
  editorial checks; MANUAL_REQUIRED for human-only checks; computed overall.
  `npm run qa`.
- **Captions**: SRT (Remotion `serializeSrt`) and ASS outputs; clean master
  vs captioned derivative (`CaseVideo` `showCaptions` / `withNarration`).
  `npm run deliverables` (also chapters + credits).
- **YouTube package**: contract, chapter rules (YouTube's published
  requirements), credits builder, metadata validation (claims, legal terms,
  guilt labels, clickbait, synthetic marking).
- **Skills**: `crime-documentary` (orchestrator), `narration`,
  `visual-director`, `asset-research`, `remotion-video`, `video-qc`,
  `youtube-package`. Existing five bumped to 1.1.0 (gate wiring).
- **Fixture**: real draft narration (SAPI, 101.37 s measured), alignment,
  visual bible, visual states, run with pending gates, QA report from a real
  render, YouTube package, SRT/ASS/chapters/credits.
- **Dependency**: `@remotion/media` 4.0.530 (official `<Audio>`).
- `npx remotion versions` added to the verification routine.
- Tests: 104 → 214.

### Removed

- `CaptionTrack` / `captions.json` — word timings now live in
  `NarrationAlignment.words` (no duplicate timing artifact). No persisted
  instances existed.
- `EstimatedCaptionTimingProvider` → `EstimatedAlignmentProvider`.

### Fixed

- zod pinned 4.6.5 → 4.5.4: `npx remotion versions` flagged a mismatch with
  Remotion 4.0.530 that had existed since 0.1.0 (Phase 0 checked only that
  Remotion packages matched each other). Now: "All packages have the
  correct version".
- QA probing failed on paths containing spaces (now quoted).
- Prettier corrupted Markdown emphasis in skills; `skills/` is now excluded.

## [0.1.0] — 2026-09-29 — Phase 0: Foundation

### Added

- **Project**: Remotion 4.0.530 blank template (TypeScript, React 19), npm,
  ESLint (Remotion flat config), Prettier, Vitest 5, tsx, zod 4.
  Tailwind removed from the template (not needed for this visual style).
- **Official Remotion Agent Skills** (12) via `npx skills add remotion-dev/skills`
  into `.claude/skills` and `.agents/skills`, pinned in `skills-lock.json`.
- **Domain contracts** (`src/domain`, schema version 1): CaseProject,
  CaseCandidate, CaseSource, SourceReference, CaseClaim, ClaimEvidence,
  Person, Organization, Location, CaseEvent, CaseTimeline, DateSpec,
  ResearchBrief, StoryAngle, StoryPlan, StorySequence, Reveal,
  ScriptDocument, NarrationUnit, VisualPlan, Shot, SceneBeat,
  AssetRequirement, AssetRecord, CaptionTrack, ProductionManifest.
- **Research policy**: source authority levels with per-type ceilings;
  evidence-based claim verification; legal-language and attribution rules.
- **Validation**: schema parsing with version checks plus ~90 stable issue
  codes across research, timeline, story, script, visual, assets, manifest.
- **Storytelling utilities**: narration duration estimate; script style lint
  (clichés, invented interiority, rhetorical-question density).
- **Production**: shot timing and manifest builder with serialization.
- **Providers**: cost policy (paid refused by default), NarrationProvider and
  CaptionTimingProvider interfaces, local estimated caption timing.
- **Remotion**: 15 primitives (DocumentaryFrame, SafeArea, CaptionLayer,
  SourceCitation, DateCard, LocationCard, DocumentViewer, PhotoFrame,
  Timeline, MapPlaceholder, EvidenceBoard, LowerThird, SectionTitle,
  QuoteCard, RepresentationLabel), a shot→scene adapter, `FixturePreview`
  and a per-primitive gallery.
- **Project skills v1.0.0**: case-research, source-verification,
  case-timeline, crime-story-director, crime-script-writer.
- **Synthetic fixture**: fictional "Tern River Mill Payroll" case covering
  every claim status, every date precision, an allegation, a charge and
  acquittal, a disputed time, a verified quote, a contradicted myth, an
  excluded rumor, a labeled illustration, and an UNKNOWN-rights asset.
- **CLIs**: `validate:case`, `new:case`, `build:manifest`, `skills:sync`,
  `health`.
- **Docs**: ARCHITECTURE, RESEARCH_AND_FACT_CHECKING, AGENT_SKILLS,
  VIDEO_PIPELINE, FREE_FIRST_STACK (terms verified 2026-09-29),
  PROJECT_PROGRESS, health log.

### Security

- Vitest upgraded from 3.2.4 to 5.0.2 to clear GHSA-82fw-gwwq-j7x9
  (`npm audit`: 0 vulnerabilities).
