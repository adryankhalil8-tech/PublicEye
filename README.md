# PublicEyeYT — Crime Documentary System

A local-first, free-first production system for faceless YouTube
documentaries about crimes, court cases, investigations, historical trials,
and unsolved cases. Target: 5–10 minute videos rendered with
[Remotion](https://www.remotion.dev/).

Accuracy, source traceability, and storytelling quality come before
automation. The system is built so that inaccurate paths — an allegation
stated as fact, an unverified claim in the script, an unlabeled
reconstruction, an unlicensed image, an unapproved script being voiced —
fail validation or are refused by the pipeline.

> **Status:** Phase 1 (Real Case Intelligence) in progress — research tooling built, three candidate cases proposed, waiting on case selection.
> Foundation and architecture integration complete (v0.2.0).
> The full pipeline runs end to end on a synthetic fixture — including real
> local narration, measured timing, a render, and QA. **No real case has been
> researched or produced yet.** See [docs/PROJECT_PROGRESS.md](docs/PROJECT_PROGRESS.md).

## How it works

```
Research → Claims → Verification → Timeline → [Gate 1: Research]
→ Story → Script → [Gate 2a: Script]
→ Narration → measured audio → Alignment
→ Visual bible → Timed shots + visual states → [Gate 2b: Pre-production]
→ Assets → Remotion render → Technical QA → Editorial/visual QA
→ Captions (SRT/ASS) → YouTube package → [Gate 3: Publication] → publish (manual)
```

Each step writes a human-readable file in `data/cases/<case-id>/`, validated
against typed contracts. A resumable run (`runs/<run-id>.json`) tracks every
stage, never regenerates finished work, and retries only what failed. Gates
are approved by a named human, never by an agent. The `crime-documentary`
skill orchestrates; one skill per stage does the work.

## Quick start

Requirements: Node ≥ 20 (developed on Node 24.14, npm 11.11). Local
narration uses Windows SAPI (built into Windows).

```bash
npm install
npm run dev        # Remotion Studio (FixturePreview + primitive gallery)
npm run check      # format, lint, typecheck, tests
npm run health     # all gates; appends to docs/health/HEALTH_LOG.md
```

No API keys or paid services are needed. `.env.example` documents the
optional paid-provider opt-in (off by default).

## Commands

| Command                                                                  | What it does                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- | ------- | --------- | ------------------------------------------------------------- |
| `npm run dev`                                                            | Open Remotion Studio                                          |
| `npm run compositions`                                                   | List compositions                                             |
| `npm run new:case -- <slug> "<Name>"`                                    | Scaffold `data/cases/case-<slug>/`                            |
| `npm run validate:case -- <case> [--all]`                                | Validate a case workspace (exit 1 on errors)                  |
| `npm run pipeline -- init <case>`                                        | Create a resumable run                                        |
| `npm run pipeline -- status <case>`                                      | Show what a resume would do, stage by stage                   |
| `npm run pipeline -- mark <case> <STAGE> <STATUS>`                       | Record a stage transition                                     |
| `npm run gate -- request <case> <TYPE>`                                  | Open a human approval gate                                    |
| `npm run gate -- approve <case> <gate-id> --by="human:<name>" --all-yes` | Human approval (also `reject`, `changes`, `show`)             |
| `npm run narrate -- <case> [--draft]`                                    | Local narration → measured audio → alignment                  |
| `npm run build:manifest -- <case>`                                       | Timed manifest (from measured narration)                      |
| `npm run deliverables -- <case>`                                         | `captions.srt`, `captions.ass`, `chapters.txt`, `credits.txt` |
| `npm run qa -- <case>`                                                   | QA report (ffprobe, silence detection, editorial checks)      |
| `npm run render:fixture:master`                                          | Fixture master: narration, no burned captions                 |
| `npm run render:fixture:captioned`                                       | Fixture captioned derivative                                  |
| `npm run cl -- search                                                    | cluster                                                       | opinion | budget …` | CourtListener lookups (cached, rate-limited; token in `.env`) |
| `npm run snapshot -- <case> <src-id> [--file=…]`                         | Save + hash exactly what a source said                        |
| `npm run candidate -- list                                               | validate                                                      | select  | reject …` | Case candidates; selection is human-only                      |
| `npm run review-packet -- <case>`                                        | Gate 1 review packet with excerpt checks                      |
| `npm run skills:sync`                                                    | Copy `skills/*` into `.claude/skills` and `.agents/skills`    |
| `npm test` · `typecheck` · `lint` · `format`                             | Quality tools                                                 |
| `npm run health`                                                         | Run all gates, time them, log the result                      |

## Repository layout

```
src/
  domain/         Versioned contracts (zod): case, sources, claims, entities, timeline,
                  research, story, script, narration, visual bible, visual, assets,
                  manifest, run state + gates, QA, YouTube package
  research/       Source authority, claim verification policy, legal language rules
  storytelling/   Drafting duration estimate, script style lint
  validation/     Workspace parsing + ~140 cross-reference/policy issue codes
  pipeline/       Stage graph, fingerprints, resume planner, gates, cost gate
  production/     Timing from alignment, manifest, captions (SRT/ASS), chapters, credits, WAV
  qa/             Technical, visual, and editorial QA
  providers/      Cost policy, narration + alignment interfaces
  remotion/       Primitives, shot→scene adapter, compositions, theme
skills/           13 project agent skills incl. the crime-documentary orchestrator
fixtures/cases/   Synthetic test case (fictional; .invalid URLs)
data/cases/       Real case workspaces (one folder per case)
assets/           Media library = Remotion public dir (binaries git-ignored)
scripts/          Node CLIs
tests/            Vitest suite (214 tests)
docs/             Architecture, fact-checking, skills, video pipeline, free stack, progress
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — pipeline, contracts, run state, resume, gates, cost gate, Remotion's role
- [Research & Fact-Checking](docs/RESEARCH_AND_FACT_CHECKING.md) — claim ledger, authority, verification, legal statuses
- [Agent Skills](docs/AGENT_SKILLS.md) — orchestrator, stage skills, official Remotion skills
- [Video Pipeline](docs/VIDEO_PIPELINE.md) — narration, visual bible, visual states, timing, captions, QA
- [Free-First Stack](docs/FREE_FIRST_STACK.md) — free/local options with verified terms; cost audit
- [Project Progress](docs/PROJECT_PROGRESS.md) — phase tracker and success criteria
- [Changelog](CHANGELOG.md) — what changed, per version
- [Health Log](docs/health/HEALTH_LOG.md) — measured quality/performance per run
- [Agent instructions](AGENTS.md) — rules for Codex / Claude Code

## Tracking progress and performance

Three files, three jobs:

1. **[docs/PROJECT_PROGRESS.md](docs/PROJECT_PROGRESS.md)** — _where are we?_
   Phase roadmap, success criteria with evidence, sprint log.
2. **[CHANGELOG.md](CHANGELOG.md)** — _what changed?_ Every notable change,
   grouped by version, with schema and pipeline-order changes called out.
3. **[docs/health/HEALTH_LOG.md](docs/health/HEALTH_LOG.md)** — _how healthy
   is it?_ One row per `npm run health`: gate results, test counts, fixture
   validation, fixture length, lines of code, and gate run time.

## Principles

- **Facts are never fabricated for drama.** Tension comes from order,
  questions, reveals, contrast, and pacing.
- **Discovery sources find cases; they never prove claims.**
- **Uncertainty is data.** Approximate dates stay approximate; disputes stay disputed.
- **Illustrations are labeled.** Generated imagery never poses as evidence.
- **Narration is the clock.** Visual timing comes from measured audio, not estimates.
- **Humans own the gates.** Research, script, pre-production, and publication approvals are explicit and personal.
- **Free and local first.** Paid services are optional, off by default, and need per-job human cost approval.

## License and cost notes

This repository is private (`UNLICENSED`). Remotion is free for individuals,
non-profits, and for-profit organizations with up to 3 employees; larger
companies need a Remotion Company License. Mandatory paid services: none.
See [docs/FREE_FIRST_STACK.md](docs/FREE_FIRST_STACK.md).
