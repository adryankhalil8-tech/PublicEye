# Research and Fact-Checking

This channel covers real people and real crimes. The system is built so that
the easiest path produces an accurate video and the inaccurate paths fail
validation.

## 1. Source authority

| Level              | Examples                                                                                                         | May support facts?                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `PRIMARY`          | court opinion, filing, transcript, government report, FBI record, agency record, authenticated archival document | Yes — strongest                                             |
| `STRONG_SECONDARY` | established news organization, academic publication, established historical publication, book                    | Yes                                                         |
| `SECONDARY`        | educational case archive, legal explainer, reputable case summary                                                | Yes, but not alone for CORE or legal-status claims          |
| `DISCOVERY_ONLY`   | listicle, blog, aggregator, unsourced summary, social media                                                      | **No.** Can surface a case; never the authority for a claim |

Each `sourceType` has a **ceiling** (`AUTHORITY_CEILING` in
`src/research/authority.ts`). A researcher may lower a source (a tabloid
article → SECONDARY) but never raise it (a blog can't be PRIMARY). Violations
are `AUTHORITY_ABOVE_CEILING` errors.

Initial research sources (architecture only — nothing is scraped yet):
FBI History "Famous Cases" and Major Cases (discovery + some primary
records), Famous Trials (educational archive → SECONDARY / discovery),
law-firm case lists such as Grabel (DISCOVERY_ONLY), CourtListener and RECAP
(primary court records), National Archives, Library of Congress, state and
federal court sites, government reports, reputable journalism.

## 2. Claims

A `CaseClaim` is one atomic assertion with evidence. Its `assertion.type` is
the core safety mechanism:

| Type           | Meaning                                                           | Example                                          |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| `FACT`         | It happened                                                       | "The payroll was found missing on Nov 12, 1954." |
| `ATTRIBUTED`   | Someone said it (`attributedTo`, `verb`)                          | "Police alleged that Tallis opened the safe."    |
| `LEGAL_STATUS` | Standing in a legal matter (`subjectId`, `legalStatus`, `matter`) | "Tallis was acquitted on Mar 24, 1955."          |
| `QUOTE`        | Verbatim words (`speaker`, `quoteText`)                           | Judge's written line                             |

An ATTRIBUTED claim can be fully **SUPPORTED** — the police really did allege
it — while the underlying act stays unproven. The script must keep the
attribution (enforced: `ATTRIBUTION_DROPPED`).

## 3. Verification statuses and policy

`UNVERIFIED → SUPPORTED | DISPUTED | CONTRADICTED | INSUFFICIENT_EVIDENCE`

`assessClaimSupport` (`src/research/verification.ts`) computes the strongest
status the evidence justifies; recording SUPPORTED above that is a
`CLAIM_STATUS_EXCEEDS_EVIDENCE` error.

- SUPPORTED needs a SUPPORTS evidence from a non-discovery source, plus:
  - **CORE** claims: a PRIMARY source, or ≥2 _independent_ STRONG_SECONDARY
    (same publisher counts once).
  - **LEGAL_STATUS**: PRIMARY or STRONG_SECONDARY.
  - **QUOTE**: the quote must appear **verbatim** in a PRIMARY or
    STRONG_SECONDARY evidence excerpt.
- A contradiction from an equal-or-stronger source caps the claim at DISPUTED.
- DISPUTED / CONTRADICTED / INSUFFICIENT_EVIDENCE are always permitted
  (weaker statements are never a factual risk).

## 4. Allegation, charge, conviction

Legal statuses: `ALLEGED, SUSPECTED, ACCUSED, ARRESTED, CHARGED, INDICTED,
CONVICTED, ACQUITTED, DISMISSED, OVERTURNED, UNSOLVED, DISPUTED, UNKNOWN`.
They are distinct: suspicion is not an arrest, an arrest is not a charge, a
charge is not a conviction, and an overturned conviction is not a
conviction. Not every claim needs one — a legal status applies to a named
subject in a specific matter, recorded as a `LEGAL_STATUS` claim.

Enforcement:

1. A person's `legalStatuses` entries must each cite a SUPPORTED LEGAL_STATUS
   claim with the same status and subject (`LEGAL_STATUS_MISMATCH`,
   `LEGAL_STATUS_UNSUPPORTED`).
2. Narration containing "convicted", "found guilty", "acquitted", "indicted",
   "charged with" (errors) or "was arrested", "overturned", "dismissed"
   (warnings) must cite a SUPPORTED LEGAL_STATUS claim with a matching
   status **in the same unit** (`LEGAL_TERM_UNSUPPORTED`).
3. Guilt-presuming labels ("killer", "thief", "the perpetrator") are always
   flagged for review (`GUILT_LABEL`).
4. Narration citing an ATTRIBUTED claim must name who asserted it
   (`ATTRIBUTION_DROPPED`) — this is what stops "police alleged X" from
   silently becoming "X happened".
5. The same rules apply to YouTube titles, descriptions, and thumbnail text
   (`PACKAGE_LEGAL_TERM_UNSUPPORTED`, `PACKAGE_GUILT_LABEL`), and each
   package lists what its thumbnail must not imply.

## 5. Script framing

Every narration unit declares a framing that is checked against its claims:

| Framing       | Allowed claim statuses                     |
| ------------- | ------------------------------------------ |
| `STATED`      | SUPPORTED                                  |
| `ATTRIBUTED`  | SUPPORTED (and attribution words present)  |
| `UNCERTAIN`   | SUPPORTED, INSUFFICIENT_EVIDENCE, DISPUTED |
| `DISPUTED`    | SUPPORTED, DISPUTED, INSUFFICIENT_EVIDENCE |
| `CORRECTION`  | SUPPORTED, CONTRADICTED                    |
| `NON_FACTUAL` | none (and no numbers/dates)                |

UNVERIFIED claims can never appear in a script, a hook, on-screen text, or a
reveal. Quotation marks must wrap words from a SUPPORTED QUOTE claim cited
in the same unit (`UNSOURCED_QUOTE`).

## 6. Dates

`DateSpec` holds only the precision the sources give: `EXACT` (to year,
month, or day), `APPROXIMATE` (circa/early/late…), `RANGE`, or `UNKNOWN`
(optionally ordered relative to other events). Validation:

- errors on definite misordering (`TIMELINE_ORDER`) and inverted ranges;
- reports every uncertain date as INFO so nobody "tidies" it;
- warns when a day-precise date lacks PRIMARY support;
- errors when an event is CONFIRMED on claims that are not SUPPORTED.

## 7. What is never allowed

Invented dialogue, motives, thoughts, evidence, events, quotes, court
findings, or timelines. Storytelling may be dramatic through _order_,
_questions_, _reveals_, _contrast_, and _pacing_ — never through fabrication.

## 8. The claim ledger stays central

The pipeline is never `Research → Script`. It is:

```
Sources → Claims (+evidence) → Verification → Timeline → Gate 1 → Story → Script → Gate 2a → …
```

Every factual sentence in narration, every on-screen name/date/quote, every
title and description cites claim IDs; every claim cites evidence with a
source locator. Downstream artifacts never restate facts without that link,
and editorial QA re-checks the links on the finished video.

## 9. Human review and gates

Validation catches structural and lexical errors. It cannot tell whether an
excerpt was read correctly or whether framing is fair. So:

- **Gate 1 — RESEARCH** (before the story is finalized): CORE claims
  supported as read in the source; allegations attributed; legal outcomes
  correct and current; contradictions documented; timeline gaps understood;
  sensitivity (minors, living private individuals, victims' families).
- **Gate 2a — SCRIPT** (before narration): sentences match claims; framing
  fair; nothing invented.
- **Editorial QA** after render: automated re-checks (claims still supported,
  legal terms, quotes, dates, visual vs evidence, attribution, captions match
  script) **plus** a mandatory human watch-through (`MANUAL_REQUIRED`).
- **Gate 3 — PUBLICATION**: QA passed, captions/credits correct, metadata no
  stronger than the video.

Gates are approved only by a named human, against a fingerprint of exactly
what they reviewed; any later change re-opens them. A FINAL manifest
requires a passing QA report, QC flags, and narration produced from the
approved script.
