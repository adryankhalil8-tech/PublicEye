---
name: crime-script-writer
description: Write documentary narration (script.json) from a StoryPlan and verified claims, as claim-linked narration units with explicit framing (stated / attributed / uncertain / disputed / correction / non-factual). Targets 5–10 minutes using a duration estimate, not a fixed word count. Use after crime-story-director.
version: 1.1.0
---

# crime-script-writer

## PURPOSE

Turn the story plan into narration a listener can follow, where every
factual sentence traces to a verified claim and every uncertainty is audible.

## INPUTS

- `story-plan.json`, `claims.json`, `timeline.json`, `entities.json`,
  `case.json` (`targetDurationSec`).
- Contract: `src/domain/script.ts`. Checks: `src/validation/checks-story.ts`,
  `src/storytelling/script-lint.ts`, `src/storytelling/duration.ts`.

## OUTPUTS

- `script.json` (`ScriptDocument`): ordered `units`, each with `sequenceId`,
  `text`, `framing`, `claimIds`, optional `pauseAfterSec`, `deliveryNotes`.
- A SCRIPT gate request (`npm run gate -- request <case> SCRIPT`). Narration
  is produced only after a human approves it (Gate 2a). The word-count
  estimate is for drafting; final timing comes from measured narration.

## PROCESS

1. Walk the story plan sequence by sequence. Write short units (one to three
   sentences) — each unit is the smallest piece that can be re-voiced or
   re-timed on its own.
2. For every unit choose `framing` (see the table below) and link its claims.
   UNVERIFIED claims are never allowed.
3. **Legal language**: "charged", "indicted", "convicted", "acquitted",
   "dismissed", "overturned" require a SUPPORTED LEGAL_STATUS claim with the
   matching status **in the same unit**.
4. **Quotes**: quotation marks only around words from a SUPPORTED QUOTE
   claim cited in the same unit. Otherwise paraphrase with attribution.
5. **Duration**: run `npm run validate:case -- <case-id> --all` and read
   `SCRIPT_DURATION_ESTIMATE`. Adjust content (not speaking rate) to land
   within 20% of the target. Use `pauseAfterSec` for deliberate silence.
6. Fix every ERROR and review every `STYLE_*` warning.

### Framing table

| Framing       | Use for                                   | Claims allowed                               |
| ------------- | ----------------------------------------- | -------------------------------------------- |
| `STATED`      | Established facts                         | SUPPORTED only                               |
| `ATTRIBUTED`  | "Police alleged…", "She testified…"       | SUPPORTED; text must name who asserted it    |
| `UNCERTAIN`   | "It is not clear whether…"                | SUPPORTED / INSUFFICIENT_EVIDENCE / DISPUTED |
| `DISPUTED`    | Competing accounts, side by side          | SUPPORTED / DISPUTED / INSUFFICIENT_EVIDENCE |
| `CORRECTION`  | Debunking a myth                          | SUPPORTED / CONTRADICTED                     |
| `NON_FACTUAL` | Connective tissue with no factual content | none                                         |

## QUALITY RULES

Documentary voice:

- Concrete over vague: names, dates, places, documents.
- Plain, confident sentences. Vary length. Let facts carry weight.
- Rhetorical questions sparingly (≈ at most 1 in 6 units, never back to
  back). One central question, asked well, beats ten.
- Avoid: fake quotes, fake dialogue, invented thoughts/feelings ("he must
  have felt"), sensational filler ("sent shockwaves"), repetitive hooks,
  generic AI phrasing ("little did they know", "delve", "tapestry"),
  overwritten prose, guilt labels ("the killer") for anyone not convicted.
- Uncertainty is said out loud: "according to", "the record does not say",
  "as of 1955".
- Respect victims and families; no gratuitous detail.

## FAILURE CONDITIONS

Stop and report if:

- A sequence cannot be narrated without UNVERIFIED claims.
- The verified material is far short of the 5-minute minimum (do not pad).
- Validation ERRORs remain.

## NON-NEGOTIABLES

Never invent dialogue, quotes, motives, thoughts, evidence, events, or court
findings. Never turn an allegation into a fact or an accusation into a
conviction.
