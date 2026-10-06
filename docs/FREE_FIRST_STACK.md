# Free-First Stack

Rule: prefer free and local. A paid service is added only when there is no
reasonable free/local option, it is a major improvement, and it stays
optional (`costTier: "PAID"` providers are refused unless
`ALLOW_PAID_PROVIDERS=true`).

**Verification status.** "Verified 2026-09-29" means the provider's own
terms page was read on that date. Everything else is marked _unverified_ —
check the current terms before relying on it. Terms change; re-verify before
each production.

## Categories

- **LOCAL** — runs on this machine, no account.
- **FREE** — free service or public-domain source.
- **FREE WITH LIMITS** — free tier, rate limits, or license conditions.
- **PAID OPTIONAL** — never required.

## Research and court records

| Option                                 | Category                  | Notes                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CourtListener REST API + RECAP Archive | FREE WITH LIMITS          | **Verified 2026-09-29.** Free; token auth recommended; default authenticated limits 5/min, 50/hour, 125/day; RECAP gives PACER dockets/documents already made public. Memberships / commercial agreements for more. |
| National Archives catalog              | FREE                      | **Verified 2026-09-29.** "In general, all government records are in the public domain"; some donated materials may be copyrighted — check "Use Restriction(s)".                                                     |
| Library of Congress                    | FREE (rights vary)        | **Verified 2026-09-29.** Not everything is public domain; the Library "cannot give you permission"; user determines rights from each item's Rights & Access statement.                                              |
| FBI History / Famous Cases / Vault     | FREE (terms _unverified_) | fbi.gov blocked automated fetch; verify its copyright page manually before using its images. Treat third-party images there as not cleared.                                                                         |
| Famous Trials                          | FREE to read              | Educational archive → SECONDARY / discovery. Its media is not assumed reusable.                                                                                                                                     |
| State/federal court websites           | FREE                      | Opinions generally public; check each court's terms.                                                                                                                                                                |
| PACER directly                         | PAID OPTIONAL             | Per-page fees; prefer RECAP first.                                                                                                                                                                                  |

## Archival imagery

National Archives and Library of Congress (as above), plus state archives
and university digital collections (_unverified_, per collection). Every
image gets an `AssetRecord`; `UNKNOWN` rights are never approved.

## Stock imagery / video

| Option            | Category         | Notes                                                                                                                                                                     |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pexels            | FREE WITH LIMITS | **Verified 2026-09-29.** Free, attribution not required; may not portray identifiable people "in a bad light" — a real constraint for crime content; no unaltered resale. |
| Pixabay           | FREE WITH LIMITS | **Verified 2026-09-29.** No attribution required; no standalone redistribution; care with recognizable people and brands.                                                 |
| Wikimedia Commons | FREE WITH LIMITS | _Unverified._ Per-file licenses (PD, CC-BY, CC-BY-SA); record each.                                                                                                       |

## Maps

| Option                                                                   | Category                         | Notes                                                                                                                                                                 |
| ------------------------------------------------------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schematic maps (`MapPlaceholder`)                                        | LOCAL                            | Current approach.                                                                                                                                                     |
| OpenStreetMap public tile servers                                        | **Not suitable**                 | **Verified 2026-09-29.** Tile policy forbids bulk/pre-fetching and building tile archives; video rendering pre-fetches, so do not render from tile.openstreetmap.org. |
| OSM data + self-rendered tiles / MapLibre with local or permissive tiles | LOCAL / FREE WITH LIMITS         | _Unverified_ per tile provider. Attribution "© OpenStreetMap contributors". Official `remotion-maps` skill covers the rendering side.                                 |
| Mapbox / MapTiler                                                        | FREE WITH LIMITS / PAID OPTIONAL | _Unverified._                                                                                                                                                         |

## Narration (TTS)

| Option                       | Category      | Notes                                                                                                                                                                                                                        |
| ---------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Piper (OHF-Voice/piper1-gpl) | LOCAL         | **Verified 2026-09-29.** Fast, fully local neural TTS; engine is GPL-3.0; **each voice model has its own license** — check the voice card before commercial use.                                                             |
| Windows SAPI (System.Speech) | LOCAL         | **Implemented** (`SystemNarrationProvider`). Built into Windows; verified 2026-09-30 on the dev machine (voices: Microsoft David, Microsoft Zira). Robotic — drafts, timing, and fixtures only. macOS `say` not implemented. |
| Human voice-over             | LOCAL         | Always an option; `ManualRecordingProvider` planned.                                                                                                                                                                         |
| ElevenLabs, OpenAI TTS       | PAID OPTIONAL | _Unverified_ free tiers. Behind the policy gate.                                                                                                                                                                             |

## Transcription / caption timing

| Option                                          | Category      | Notes                                                                                                                                                                |
| ----------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Script-based estimate                           | LOCAL         | Implemented (`EstimatedAlignmentProvider`); drafting only, never times a REVIEW/FINAL render.                                                                        |
| Per-unit synthesis alignment                    | LOCAL         | **Implemented** (`npm run narrate`): each unit voiced separately, joined with exact silences, measured from WAV headers. Exact unit timing; word times interpolated. |
| whisper.cpp via `@remotion/install-whisper-cpp` | LOCAL         | **Verified 2026-09-29.** MIT package; installs whisper.cpp + model and transcribes locally with token timestamps; `toCaptions` → Remotion captions.                  |
| faster-whisper                                  | LOCAL         | _Unverified_; Python dependency.                                                                                                                                     |
| Cloud transcription APIs                        | PAID OPTIONAL | Not needed: we already know the text.                                                                                                                                |

## Music and sound effects

| Option                                 | Category         | Notes                                                                                                                                                                    |
| -------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| YouTube Audio Library                  | FREE WITH LIMITS | **Verified 2026-09-29.** Copyright-safe, monetizable on YouTube, not Content-ID claimed; some tracks need attribution in the description; off-YouTube use not addressed. |
| Freesound                              | FREE WITH LIMITS | **Verified 2026-09-29.** CC0 and CC-BY usable in monetized video (CC-BY needs credit); **CC-BY-NC is not** usable commercially. Record license per sound.                |
| Original / generated-in-house ambience | LOCAL            | Always safe.                                                                                                                                                             |

## Rendering

| Option                  | Category      | Notes                                                                                                                                                                                   |
| ----------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Remotion local render   | LOCAL         | **Verified 2026-09-29** (license file): free for individuals, for-profit organizations with up to 3 employees, and non-profits; larger for-profit organizations need a Company License. |
| Remotion Lambda / cloud | PAID OPTIONAL | Not used.                                                                                                                                                                               |

## Cost gate

Every provider declares a `costTier`. A PAID operation needs **both**
`ALLOW_PAID_PROVIDERS=true` and a human-approved `CostApproval` in the run
listing the exact jobs and an estimate at least as large
(`assertPaidOperationApproved`, `src/pipeline/cost.ts`). Assets carry
`estimatedCostUsd` (default 0). The PRE_PRODUCTION gate asks whether spend
is $0 or explicitly approved. There is no unattended paid request path.

## Cost audit (as of the architecture-integration sprint)

| Item                                                                 | Cost                                                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| remotion, @remotion/cli, @remotion/captions, @remotion/media 4.0.530 | Free for individuals, non-profits, for-profits ≤ 3 employees; Company License above that |
| Chrome Headless Shell (downloaded by Remotion)                       | Free                                                                                     |
| Remotion-bundled ffmpeg/ffprobe (QA probing, silence detection)      | Free                                                                                     |
| Windows SAPI                                                         | Free, built into Windows                                                                 |
| zod, react, typescript, vitest, eslint, prettier, tsx                | Free, open source                                                                        |
| Paid narration/image/video providers                                 | **None implemented**; interfaces only                                                    |

**MANDATORY PAID SERVICES: NONE.**
