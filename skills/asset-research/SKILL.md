---
name: asset-research
description: Find, acquire, or create the media a visual plan requires — free/public-domain/local first — and record full provenance, rights, and production status per asset in assets.json. Supports selective retry (completed assets are never re-fetched). Use after the PRE_PRODUCTION gate is approved.
version: 1.0.0
---

# asset-research

## PURPOSE

Fulfil each asset requirement with media the channel is allowed to use,
and make that permission auditable.

## INPUTS

- `visual-plan.json` (`assetRequirements`), approved `visual-bible.json`.
- An APPROVED, fresh `PRE_PRODUCTION` gate.
- Free-first source list: `docs/FREE_FIRST_STACK.md`.

## OUTPUTS

- Files under `assets/<type>/…` (git-ignored binaries).
- `assets.json` — one `AssetRecord` per file: `origin`, `sourceUrl`,
  `sourceOrganization`, `creator`, `rightsStatus`, `license`,
  `creditRequired`/`creditText`, `retrievedAt`, `approval`, `status`,
  `attemptCount`, `lastError`, `estimatedCostUsd`.
- `visual-plan.json` — requirements set to FULFILLED with
  `fulfilledByAssetId`, or left OPEN/WAIVED with a reason.

## PROCESS

1. `npm run pipeline -- status <case>` — see which assets to keep, retry,
   run, or treat as exhausted. Never re-fetch COMPLETE assets.
2. For each open requirement, search in this order: primary-record
   repositories (CourtListener/RECAP, National Archives, agency sites),
   Library of Congress and public archives, free stock (Pexels/Pixabay —
   mind identifiable-people terms), then local graphics (Remotion-drawn,
   in-house SVG). AI generation is last and always labeled.
3. Record rights **per asset**, from the item's own rights statement. A
   government or archive website does not make an item public domain.
4. Set `status` as work progresses: PENDING → IN_PROGRESS → COMPLETE, or
   FAILED with `lastError` (attempts counted; 3 max).
5. Approval: `APPROVED` only with PUBLIC_DOMAIN, LICENSED, OWNED, or
   FAIR_USE_REVIEW (human approver + written rationale). UNKNOWN stays
   PENDING.
6. Any `estimatedCostUsd > 0` needs a human-approved cost approval in the
   run before acquisition. Free-first: this should be rare.
7. `npm run build:manifest -- <case>` and `npm run validate:case`.

## QUALITY RULES

- `mustBeAuthentic` requirements are never met by created/generated media.
- Credit text is exact and present whenever credit is required.
- Keep the source page URL and, ideally, an archived snapshot.
- Prefer fewer, better, cleared assets over many uncertain ones.

## FAILURE CONDITIONS

Stop and report if:

- A required authentic record cannot be found or cleared — the visual
  director must redesign the shot.
- Rights remain UNKNOWN for an asset the plan depends on.
- An asset fails 3 attempts.

## NON-NEGOTIABLES

UNKNOWN rights are never approved. No unattended paid request, ever.
Generated imagery is never presented as evidence.
