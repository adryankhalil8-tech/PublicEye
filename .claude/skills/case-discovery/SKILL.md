---
name: case-discovery
description: Find and propose real crime/court cases for the channel as CaseCandidate records (data/candidates/*.json), using targeted, cached CourtListener searches and known discovery sources. Proposes only — a human selects. Use before case-research when no case has been chosen.
version: 1.0.0
---

# case-discovery

## PURPOSE

Surface well-documented cases the system can research defensibly, and give
the human enough information to choose one. Discovery finds cases; it never
establishes facts.

## INPUTS

- The channel's criteria (below) and any topic the human asked for.
- CourtListener via `npm run cl -- search "<query>" [--after=…] [--before=…]`
  (token in `.env`; responses cached; budget enforced — check with
  `npm run cl -- budget`).
- Discovery sites (FBI "Famous Cases", Famous Trials, reputable lists) —
  DISCOVERY_ONLY.

## OUTPUTS

- 2–4 `CaseCandidate` files in `data/candidates/<cand-id>.json` with status
  `CANDIDATE` (or `SHORTLISTED`): name, summary, case type, jurisdiction,
  era, `discoveredVia`, `knownPrimarySources` (only records you actually
  located), `sensitivityFlags`, `rationale`, `risks`.
- A short recommendation to the human. Then STOP.

## PROCESS

1. Apply the selection criteria:
   - closed and adjudicated (no ongoing proceedings);
   - primary records reachable for free (ideally opinions on CourtListener);
   - no minors as central figures;
   - no living private individuals who were never convicted;
   - enough documented tension for 5–10 minutes without invention.
2. Search narrowly: field queries (`caseName:(X)`), date windows
   (`--after/--before`), quoted phrases. Every live call spends budget; the
   cache makes repeats free. Never paginate through results "to see
   everything" — this is not a crawler.
3. For each candidate, record only primary sources you actually found
   (CourtListener opinion URLs from the search output).
4. Write the summary as a discovery summary and keep it UNVERIFIED in
   `notes`. Do not write it as established fact.
5. Flag sensitivity honestly; list concrete risks (folklore, contested
   verdicts, thin records, living family).
6. `npm run candidate -- validate` — zero errors.
7. Present the candidates and a recommendation. The human runs
   `npm run candidate -- select <cand-id> --by="human:<name>"`.

## QUALITY RULES

- Prefer cases where the legal record is clear about who was charged,
  convicted, or acquitted, so the allegation-vs-conviction rules can work.
- Variety of risk: say plainly which candidate is the safest first case.
- A candidate with no primary sources is not a candidate.

## FAILURE CONDITIONS

Stop and report if:

- the CourtListener budget is exhausted (`npm run cl -- budget`);
- no candidate meets the criteria;
- a site blocks access (ask the human to download, or skip it).

## NON-NEGOTIABLES

Never select or reject a case yourself. Never treat a discovery source as
factual authority. Never invent case names, citations, or URLs — list only
what a search returned. Validate with `npm run candidate -- validate`; once a
case is selected and scaffolded, `npm run validate:case -- <case-id>` governs.
