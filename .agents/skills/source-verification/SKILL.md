---
name: source-verification
description: Decide whether each claim in a case workspace is sufficiently supported, and set its verification status (SUPPORTED / DISPUTED / CONTRADICTED / INSUFFICIENT_EVIDENCE). Use after case-research and before building the timeline or story. Also flags uncertain dates, questionable quotes, and allegations presented as fact.
version: 1.1.0
---

# source-verification

## PURPOSE

Move every claim out of `UNVERIFIED` into a status the evidence actually
justifies. This is the gate between "things sources say" and "things the
video may state". It updates `claims.json` and person legal-status history.

## INPUTS

- `data/cases/<case-id>/sources.json`, `claims.json`, `entities.json`,
  `research.json`.
- Policy code: `src/research/verification.ts` (`assessClaimSupport`) and
  `src/research/authority.ts`. Validation enforces this policy — read it.

## OUTPUTS

- `claims.json`: each claim's `status`, `confidence`, `notes`, and
  `verification: { verifiedBy: "skill:source-verification@1", verifiedAt }`.
  Add any missing evidence you found (including `CONTRADICTS` evidence).
- `entities.json`: `legalStatuses` entries for people, each citing a
  SUPPORTED `LEGAL_STATUS` claim, in chronological order.
- `research.json`: new/updated `contradictions` and `openQuestions`.

## PROCESS

1. For each claim, starting with `CORE` ones, re-read every cited excerpt in
   its source. Confirm the excerpt says what the claim says.
2. **Check the assertion type.** If the source only reports that someone
   _alleged/claimed/testified_ something, the claim must be `ATTRIBUTED`. Fix
   the type rather than upgrading the fact.
3. **Cross-check.** Look for a second, independent source (different
   publisher). Prefer PRIMARY. Add `CONTRADICTS` evidence where sources
   disagree.
4. **Assign status** using the policy (validation rejects violations):
   - `SUPPORTED` — citable (non-discovery) support, plus:
     CORE → a PRIMARY source or ≥2 independent STRONG_SECONDARY;
     LEGAL_STATUS → PRIMARY or STRONG_SECONDARY;
     QUOTE → quote appears **verbatim** in a PRIMARY/STRONG_SECONDARY excerpt.
   - `DISPUTED` — credible sources disagree (always allowed; add the
     contradiction to `research.json`).
   - `CONTRADICTED` — stronger evidence shows it is false (e.g. an online myth).
   - `INSUFFICIENT_EVIDENCE` — only weak/discovery support, or nothing verbatim.
5. **Set confidence** (`HIGH` / `MEDIUM` / `LOW`) honestly; it does not
   override status.
6. **Legal status.** For each SUPPORTED `LEGAL_STATUS` claim, add the matching
   entry to the person's `legalStatuses`. Record the **final** outcome
   (acquitted, overturned, dismissed) as clearly as the charge.
7. **Dates.** Flag day-precise dates that rest only on secondary sources;
   prefer month/year precision where that is all the record supports.
8. **Quotes.** If a quote cannot be matched verbatim, it is not a quote:
   paraphrase it as an ATTRIBUTED claim instead.
9. Run `npm run validate:case -- <case-id>`. Zero ERRORs is the exit gate.

## QUALITY RULES

- Status reflects evidence, not narrative convenience.
- An allegation can be SUPPORTED **as an allegation** — that never makes the
  underlying act established.
- Two articles from the same outlet (or syndicating the same wire story) are
  one source, not two.
- A court acquittal, dismissal, or reversal outranks earlier press coverage
  of an arrest or charge.
- Contradictions are recorded, not silently resolved.

## FAILURE CONDITIONS

Stop and report if:

- A CORE claim of the chosen angle cannot reach SUPPORTED — the story angle
  must change before scripting.
- The legal outcome for a named person cannot be established: the script
  cannot describe their guilt or innocence.
- Primary records contradict the premise that made the case attractive.

## NON-NEGOTIABLES

Never mark a claim SUPPORTED to make a story work. Never convert "alleged",
"accused", "charged", or "indicted" into "convicted" or "did". Never treat a
DISCOVERY_ONLY source as support.
