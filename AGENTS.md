# Agent Instructions

Faceless crime / court-case documentary system. Remotion + TypeScript,
local-first, free-first. Read `docs/ARCHITECTURE.md` first.

## Non-negotiables (real people, real crimes)

- Never invent dialogue, quotes, motives, thoughts, evidence, events, court
  findings, dates, or timelines.
- Never turn an allegation into a fact or an accusation/charge into a
  conviction. Use ATTRIBUTED and LEGAL_STATUS claims.
- UNVERIFIED claims never reach a script, hook, reveal, or on-screen text.
- Generated or illustrative imagery is always labeled on screen.
- UNKNOWN rights are never approved.
- Never add a mandatory paid service. Paid operations go through
  `assertPaidOperationApproved`: env opt-in AND a human-approved cost approval.
- Synthetic fixtures use `.invalid` URLs and fictional people only. Never
  write fake facts about a real person, even for tests.

## Workflow

To produce or resume a case, load the `crime-documentary` orchestrator
skill. It runs `npm run pipeline -- status <case>`, dispatches the stage
skills in `skills/` one at a time (synced to `.claude/skills` and
`.agents/skills`), and stops at every human gate. Each stage ends with
`npm run validate:case -- <case-id>`.

- Never approve/reject/answer a gate or mark a manual QA check reviewed.
  Request gates; humans resolve them (`npm run gate -- … --by="human:<name>"`).
- Never regenerate work the resume plan marks KEEP.
- Narration before visual timing: never finalize visual timing on an
  ESTIMATED alignment.

For Remotion code, load the official `remotion-best-practices` skill. Do not
edit `remotion-*` skill folders; they are managed by `npx skills`.

## Code rules

- `src/` is isomorphic (Node + Remotion bundle): no `fs`/`path` there. File
  access lives in `scripts/`.
- Contracts are zod schemas in `src/domain`; change them deliberately and
  follow the schema-versioning note in `docs/ARCHITECTURE.md`.
- Visual plans describe intent, not components. ShotType → component
  mapping lives only in `src/remotion/adapters/scene-spec.ts`.
- Remotion animation: `useCurrentFrame()` + `interpolate()`; no CSS
  transitions.

## Before finishing any change

```bash
npm run check        # format:check + lint + typecheck + tests
npm run health       # full gates incl. compositions + bundle; logs a row
```

Update `CHANGELOG.md` and, at sprint end, `docs/PROJECT_PROGRESS.md`.
