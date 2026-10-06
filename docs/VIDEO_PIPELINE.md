# Video Pipeline

From an approved script to a QA-checked master and editable captions.

## Format

1920×1080, 16:9, 30 fps (`RENDER_DEFAULTS`). Target 5–10 minutes. Duration
always comes from the manifest, which comes from measured narration.

## 1. Narration (before any final visual planning)

`npm run narrate -- <case>` — requires an APPROVED `SCRIPT` gate
(`--draft` for timing-only exploration, marked as such).

1. Each script unit is synthesized separately by a local provider (Windows
   SAPI today; Piper / human voice-over planned) into
   `assets/audio/<case-id>/units/<unit-id>.wav`, one fixed PCM format.
2. Each take's duration is **read from the WAV header** — measured, never
   estimated.
3. Takes are joined with each unit's `pauseAfterSec` inserted as real
   silence → `assets/audio/<case-id>/narration.wav`, measured again.
4. Because the join is sample arithmetic, every unit's position on the final
   timeline is exact: `narration/alignment.json` with
   `alignmentSource: PER_UNIT_SYNTHESIS`.

Contracts (`src/domain/narration.ts`):

- **NarrationArtifact** — id, script fingerprint, provider + cost tier,
  status (PENDING / GENERATED / MEASURED / FAILED), audioPath, durationSec,
  sampleRate, channels, createdAt/measuredAt, per-unit takes (status,
  attempts, lastError, text fingerprint, duration),
  `producedFromApprovedScript`, `isSynthetic`.
- **NarrationSegment** — id, narrationUnitId, startSec, endSec, durationSec,
  text, confidence?, alignmentSource?.
- **NarrationAlignment** — narrationId, alignmentSource (ESTIMATED, MANUAL,
  PER_UNIT_SYNTHESIS, TTS_TIMESTAMPS, WHISPER, WHISPER_CPP, FASTER_WHISPER,
  OTHER), audioDurationSec, segments (one per unit, in order), words
  (Remotion `Caption[]`, used for captions).

Validation: segments cover the script in order without overlap and inside
the audio; segment text equals the verified script text (aligners align the
known text, they don't replace it); audio duration matches the narration
artifact; any script edit after narration is `NARRATION_STALE` /
`NARRATION_UNIT_STALE`, and only those units are re-voiced.

## 2. Case visual bible

`visual-bible.json` (`CaseVisualBible`) locks the case's look before shot
planning and asset acquisition: styleId, projectId, **revision**, visual
tone, palette tokens, typography, composition rules, archival / document /
map / timeline / reconstruction treatments, camera, transition and texture
rules, negative constraints, and approved references (with rights).

- `reconstructionTreatment.alwaysLabeled` is the literal `true` — the schema
  cannot express an unlabeled-reconstruction style.
- Default negative constraints (`DEFAULT_NEGATIVE_CONSTRAINTS`): no police
  lights/flashing, crime-scene tape, gore, fingerprint/magnifier clichés,
  dark-alley stock, neon/glass/particles, fake headlines or documents,
  centered text everywhere. Dropping one warns.
- The visual plan and manifest record the bible revision they used; a newer
  bible makes both stale (`VISUAL_PLAN_STALE_BIBLE`, `MANIFEST_STALE_BIBLE`).
- In Remotion the bible becomes CSS custom properties at the frame root
  (`visualBibleVariables`); primitives read `theme.*` tokens and follow it.

## 3. Shots and visual states

A **Shot** is one visual idea: `shotType`, `visualIntent` (what the viewer
must understand — never a component name), `representation`, `narrationIds`,
`onScreenText` (claim-linked), `citationSourceIds`, `assetRequirementIds`.

A shot is **not one static image**. Its `beats` are **visual states**:

| State      | Use                                        |
| ---------- | ------------------------------------------ |
| ESTABLISH  | Full view of the subject                   |
| MOVE_TO    | Travel to a region                         |
| HIGHLIGHT  | Emphasize a passage/marker                 |
| DIM_OTHERS | De-emphasize everything else               |
| ANNOTATE   | Add a label/callout                        |
| REVEAL     | Bring in withheld information              |
| COMPARE    | Place two items side by side               |
| HOLD       | Deliberate stillness while narration lands |
| HANDOFF    | Carry an element into the next shot        |

Each state is anchored to a narration unit plus an offset. Example from the
fixture's opening document shot (16.1 s, including a 0.8 s scripted pause): ESTABLISH the report → HIGHLIGHT
the "no marks of force" line at `nu-002` + 0.5 s → DIM_OTHERS at + 2 s.

**Pacing:** there is no "change every N seconds" rule. A state changes when
the viewer needs new information, emphasis, spatial context, a reveal, a
comparison, or continuity. Documents, maps, and evidence diagrams can hold
long while internal states evolve. Validation only _notes_ (INFO
`LONG_STATIC_SHOT`) a shot over 12 s with no states.

## 4. Timing

`src/production/timing.ts`:

- A shot starts where its first narration segment starts on the measured
  timeline (the first shot at 0) and ends where the next shot starts; the last
  ends with the audio. Pauses stay inside shots, so picture never drifts.
- Frames come from absolute boundaries — rounding never accumulates.
- States resolve to frames relative to their shot
  (`manifest.shots[].states[].atFrame`) and must land inside it
  (`BEAT_OUTSIDE_SHOT_DURATION`).
- `durationSec` overrides are ignored (warned) — the narration is the clock.

`npm run build:manifest -- <case>` writes the timed manifest:
`timingSource: AUDIO`, `alignmentSource`, the narration track, bible
revision, and input fingerprints. REVIEW/FINAL manifests must be AUDIO-timed
from narration produced after the SCRIPT gate.

## 5. Renderer (Remotion)

`CaseVideo` executes the manifest. Shot types map to primitives in one place
(`scene-spec.ts`):

| ShotType                                                              | Primitive                                                                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| DOCUMENT_HIGHLIGHT, COURT_DOCUMENT, NEWSPAPER                         | `DocumentViewer` — verbatim excerpts, HIGHLIGHT sweep and DIM_OTHERS from state frames, contradicted claims struck, "not a facsimile" |
| DATE_CARD                                                             | `DateCard` (precision-preserving labels)                                                                                              |
| RECONSTRUCTION, ARCHIVAL_PHOTO, PORTRAIT, LOCATION, ATMOSPHERIC_BROLL | `PhotoFrame` (placeholder card without an approved asset)                                                                             |
| EVIDENCE_DIAGRAM                                                      | `EvidenceBoard` — attribution leads every card                                                                                        |
| TIMELINE                                                              | `Timeline` — ordinal, precision markers, dashed undocumented spans                                                                    |
| QUOTE                                                                 | `QuoteCard`                                                                                                                           |
| TYPOGRAPHY                                                            | `SectionTitle`                                                                                                                        |
| MAP                                                                   | `MapPlaceholder` — "schematic · not to scale"                                                                                         |

Narration plays via `<Audio>` from `@remotion/media` (`withNarration`).

### Reconstruction labels

Non-authentic imagery carries a fixed on-screen label for the whole shot:
**Illustration**, **Reconstruction**, **Dramatization**,
**AI-generated reconstruction**. Enforced: RECONSTRUCTION shots must be
ILLUSTRATIVE; CREATED_IN_HOUSE / REMOTION_GENERATED / AI_GENERATED media can
never be AUTHENTIC; AI media needs the AI label; `mustBeAuthentic`
requirements reject generated media.

## 6. Captions — master vs. derivative

| Output                        | What                                                |
| ----------------------------- | --------------------------------------------------- |
| `output/master.mp4`           | **Canonical. No burned captions.** Narration audio. |
| `output/captions.srt`         | Editable; upload to YouTube                         |
| `output/captions.ass`         | Editable, styled like the on-video captions         |
| `output/master-captioned.mp4` | Optional derivative (`showCaptions: true`)          |

All caption forms derive from `alignment.words`, so they share one clock with
the picture. Lines are ≤ 42 characters, ≤ 3.5 s, and never cross a narration
segment boundary. SRT is written with Remotion's official `serializeSrt`.
`npm run deliverables -- <case>` also writes chapters and credits.

## 7. QA

`npm run qa -- <case>` → `output/qa-report.json`:

- **Technical** (automated): render exists, duration vs manifest,
  resolution, fps, codec, file size, audio present, audio covers narration,
  unexpected silence (ffmpeg `silencedetect`, > 4 s fails), manifest assets
  produced, captions fit the video.
- **Visual**: repetition/overuse of shot types, placeholders, reconstruction
  labels, bible consistency (automated); composition/cropping, document
  legibility, safe areas (**MANUAL_REQUIRED**).
- **Editorial / fact**: script claims still supported, legal statuses,
  quotes, dates, visuals vs evidence, attribution, captions match script
  (automated from validation); full human editorial review
  (**MANUAL_REQUIRED**).

`overall` is computed: any FAIL → FAIL; any NOT_RUN or unresolved manual
check → INCOMPLETE. Validation rejects a report whose `overall` disagrees
with its checks, and manual checks resolved by anyone but `human:<name>`.

Fixture result (real render, real narration): all automated checks PASS;
overall **INCOMPLETE** pending four human checks — as designed.

## 8. Commands

```bash
npm run narrate -- <case>            # narration → measured audio → alignment
npm run build:manifest -- <case>     # timed manifest
npm run render:fixture:master        # fixture master (no captions, with narration)
npm run render:fixture:captioned     # fixture captioned derivative
npm run deliverables -- <case>       # SRT, ASS, chapters, credits
npm run qa -- <case>                 # QA report
npm run dev                          # Remotion Studio
```

Rendering is slow on the dev machine (2 cores): ~5–9 minutes per 100 s.
