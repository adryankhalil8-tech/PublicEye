---
name: case-timeline
description: Convert verified case claims into a chronological timeline.json with honest date precision (exact / approximate / range / unknown), linked to claims and sources, with documented gaps. Use after source-verification and before story planning.
version: 1.1.0
---

# case-timeline

## PURPOSE

Produce the chronology the story will be built from — without inventing
order, dates, or precision the sources do not give.

## INPUTS

- `claims.json` (verified), `sources.json`, `entities.json`.
- Contract: `src/domain/timeline.ts` (`DateSpec`, `CaseEvent`, `TimelineGap`).

## OUTPUTS

- `timeline.json`: `events` in chronological order, plus `gaps`.
- A RESEARCH gate request when research, verification, and timeline are
  done: `npm run gate -- request <case> RESEARCH`. A human approves it; the
  story cannot be finalized until they do.

## PROCESS

1. Select claims that describe something happening at a time (EVENT,
   LEGAL_PROCEEDING, INVESTIGATION, AFTERMATH categories, plus dated
   ATTRIBUTED/LEGAL_STATUS claims).
2. For each event, choose `when` at the precision the evidence supports:
   - `EXACT` with `date` of `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` (+ optional
     `time`). "December 1954" is `EXACT` `"1954-12"` — never invent a day.
   - `APPROXIMATE` with a qualifier (`CIRCA`, `EARLY`, `MID`, `LATE`,
     `BEFORE`, `AFTER`) when sources say "around", "late 1954"…
   - `RANGE` when it happened at some unknown point between two dates.
   - `UNKNOWN`, optionally with `afterEventId` / `beforeEventId` when only
     the relative order is known.
3. Link `claimIds` (at least one — no event without a claim) and
   `sourceIds` (drawn from those claims), plus `personIds`, `locationIds`.
4. Set `certainty`: `CONFIRMED` only if every linked claim is SUPPORTED;
   `DISPUTED` if any is DISPUTED; otherwise `PROBABLE` / `UNCERTAIN`.
5. Order events. Where uncertain dates overlap, order is an editorial choice
   — keep it defensible and note it.
6. Record `gaps`: periods the sources do not cover (e.g. pre-trial months).
7. Run `npm run validate:case -- <case-id>`. It errors on definite
   misordering, inverted ranges, overstated certainty, broken references,
   and events built on CONTRADICTED claims; it warns on day-precise dates
   without PRIMARY support.

## QUALITY RULES

- Precision is never upgraded: "1950s" does not become 1955.
- Two sources giving different dates → one DISPUTED event (or a RANGE), and
  a `contradictions` entry in `research.json`.
- Descriptions are neutral and keep attribution ("Police allege…").
- Gaps are stated, not papered over.

## FAILURE CONDITIONS

Stop and report if:

- Core events cannot be ordered even relatively.
- The timeline depends on UNVERIFIED claims (go back to source-verification).
- Validation reports ERRORs.

## NON-NEGOTIABLES

Never invent dates, times, sequences, or events to fill gaps. Uncertainty is
data, not a defect.
