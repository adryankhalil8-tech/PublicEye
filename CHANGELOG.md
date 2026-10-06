# Changelog

All notable changes to this project. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[SemVer](https://semver.org/). Schema changes are called out explicitly
because they affect every case workspace.

Progress by phase: [docs/PROJECT_PROGRESS.md](docs/PROJECT_PROGRESS.md) ·
Measured health over time: [docs/health/HEALTH_LOG.md](docs/health/HEALTH_LOG.md)

## [Unreleased] — Phase 1: Real Case Intelligence (in progress)

### Added

- **CourtListener client** (`npm run cl -- search|cluster|opinion|budget`):
  token from `.env`, every response cached in `data/cache/courtlistener/`
  (git-ignored), persistent request ledger enforcing 5/min · 50/hr · 125/day
  (waits out the minute limit, stops at hour/day), 429 handling. Verified
  against the live API.
- **Source snapshots** (`npm run snapshot`): CourtListener opinions captured
  via the API (cluster + full opinion text), other URLs by one targeted GET,
  blocked sites via `--file`; SHA-256, size, type, method, and time recorded
  in `sources.json`; read-only Wayback lookup for `archivedUrl` (never
  submits pages). Snapshot files are git-ignored; hashes are committed.
  New validation: `SOURCE_NOT_SNAPSHOTTED` (real cases, CORE-claim sources).
- **Case candidates** (`npm run candidate -- list|validate|select|reject`):
  `CaseCandidate.decision`, `rationale`, `risks`; SELECTED/REJECTED only by
  `human:<name>`. Three real candidates proposed in `data/candidates/`.
- **Gate 1 review packet** (`npm run review-packet`): legal status per
  person, CORE claims with excerpts, each excerpt checked verbatim against
  its snapshot, contradictions, timeline gaps, sources, checklist.
- **Skill** `case-discovery` 1.0.0; `case-research` 1.2.0 (cl + snapshot +
  review packet); `crime-documentary` 1.1.0 (discovery and packet steps).
- **First real case — Teapot Dome** (`data/cases/case-teapot-dome/`), selected
  by human:Adryan: 9 snapshotted sources (5 court opinions via CourtListener,
  4 front pages via Library of Congress), 66 claims, 85 excerpts all verified
  verbatim against snapshots, 64 SUPPORTED / 2 INSUFFICIENT, legal-status
  histories for 6 people, 28-event timeline. Gate 1 (RESEARCH) approved by
  human:Adryan.
- **Teapot Dome story plan + script** (`story-plan.json`, `script.json`):
  angle "One Payment, Two Verdicts" (2 alternatives kept), CONTRAST hook, 8
  sequences, 4 reveals; 51 narration units (46 claim-linked), estimated ≈ 561 s at
  150 wpm (target 480 s, within tolerance). Validation: 0 errors, 0 style
  warnings. Read-aloud review in `output/script-review.md`. Gate 2a (SCRIPT)
  requested — awaiting human review.
- `npm run snapshot`: Library of Congress newspaper pages captured as OCR text.
- `scripts/check-excerpts.ts`: compact excerpt-vs-snapshot check.
- Tests: 214 → 232.

### Fixed

- RESEARCH stage went stale when `case.json` housekeeping fields (`status`,
  `updatedAt`) changed; its inputs are now the case identity only.

### Security

- A CourtListener token placed in `.env.example` (a committed template) was
  moved to the git-ignored `.env` before any commit; the template was
  restored. Secrets belong only in `.env`.

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
