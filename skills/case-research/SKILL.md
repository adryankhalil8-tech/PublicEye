---
name: case-research
description: Turn a selected true-crime / court case into a structured, source-linked research package (sources.json, claims.json, entities.json, research.json, research.md). Use when starting research on a case or adding sources to an existing case workspace. Does not verify claims (use source-verification) or write story/script.
version: 1.1.0
---

# case-research

## PURPOSE

Build the factual foundation for one case: find authoritative sources, record
their metadata, extract atomic claims with exact source locations, and map the
people, places, open questions, and contradictions. Everything downstream
(timeline, story, script, visuals) can only use what this skill records.

## INPUTS

- A case workspace: `data/cases/<case-id>/` (create with
  `npm run new:case -- <slug> "<Case name>"`).
- A case name/candidate, optionally with discovery links (FBI "Famous Cases",
  Famous Trials, listicles…).
- Contracts: `src/domain/sources.ts`, `src/domain/claims.ts`,
  `src/domain/entities.ts`, `src/domain/research.ts`.

## OUTPUTS

| File            | What you add                                                                        |
| --------------- | ----------------------------------------------------------------------------------- |
| `sources.json`  | One `CaseSource` per source, with `sourceType` and `authorityLevel`                 |
| `claims.json`   | Atomic `CaseClaim`s, **all with `status: "UNVERIFIED"`**                            |
| `entities.json` | People, organizations, locations                                                    |
| `research.json` | Summary, sensitivity flags, open questions, contradictions, sources still to obtain |
| `research.md`   | Human-readable notes: summary, source table, traps, open questions                  |

## PROCESS

1. **Start from discovery, move to primary.** A discovery source (listicle,
   blog, aggregator) tells you a case exists. Record it as `DISCOVERY_ONLY`,
   then go find: court opinions/filings (CourtListener, RECAP, state court
   sites), official records (FBI Vault/history pages, National Archives,
   agency reports), then established press and academic/historical work.
2. **Record each source** with `url`, `title`, `publisher`, `sourceType`,
   `authorityLevel`, `accessedAt`, and where possible `publicationDate`,
   `author`, `recordIdentifier` (docket no.), `archivedUrl`.
   `authorityLevel` may be _lowered_ below the type's ceiling (e.g. a tabloid
   NEWS_ARTICLE → SECONDARY) but never raised above it
   (`src/research/authority.ts → AUTHORITY_CEILING`).
3. **Extract atomic claims.** One assertion per claim. Choose `assertion.type`
   carefully — this is the most important decision you make:
   - `FACT` — the source asserts it happened.
   - `ATTRIBUTED` — someone _said/alleged/testified_ it. Set `attributedTo` and
     `verb`. "Police alleged X" is ATTRIBUTED, never FACT.
   - `LEGAL_STATUS` — charged / indicted / convicted / acquitted / dismissed /
     overturned… for a specific `subjectId` and `matter`.
   - `QUOTE` — exact words; `quoteText` must be copied verbatim.
4. **Attach evidence** to each claim: `reference.sourceId`, a locator
   (`page`, `section`, `paragraph`, `timestamp`, `docketEntry`) and a verbatim
   `excerpt`. List every evidence source in `claim.sourceIds`.
5. **Mark importance.** `CORE` = the story collapses without it. CORE claims
   will later need a PRIMARY source or two independent strong sources.
6. **Record entities.** For people: roles, `isPrivateIndividual`,
   `wasMinorAtTime`, `livingStatus`. Leave `legalStatuses` empty until the
   supporting LEGAL_STATUS claims are verified.
7. **Record contradictions** (claim IDs + source IDs) and **open questions**.
   Record sources you know exist but could not obtain in `sourcesToObtain`.
8. **Write `research.md`** for a human reviewer, including a "traps" section
   (allegations, disputed facts, myths, bounded facts like "as of 1955").
9. Run `npm run validate:case -- <case-id>` and fix every ERROR.
   (Orchestration and resume: see the `crime-documentary` skill.)

## QUALITY RULES

- Every claim has at least one evidence entry with a locator and excerpt.
- Claims are phrased neutrally and keep their attribution in `text`.
- Bounded facts stay bounded: "not recovered as of April 1955", not "never".
- Do not merge two sources' versions of a fact into one claim. If they
  disagree, record both and a `contradictions` entry.
- Names of minors and private individuals: record, but flag sensitivity.
- Never store a private residence's exact address.
- All claims leave this skill as `UNVERIFIED`. Verification is a separate step.

## FAILURE CONDITIONS

Stop and report instead of continuing if:

- No PRIMARY or STRONG_SECONDARY source can be found for the case's core
  events (the case is not documentable enough — recommend a different case).
- The only sources are DISCOVERY_ONLY.
- The case involves ongoing proceedings or unconvicted living private
  individuals in a way that needs editorial/legal review first.
- `npm run validate:case` reports ERRORs you cannot resolve.

## NON-NEGOTIABLES

Never invent sources, quotes, dates, dialogue, motives, or events. Never
record an allegation as a FACT. Never use a DISCOVERY_ONLY source as the
authority for a claim.
