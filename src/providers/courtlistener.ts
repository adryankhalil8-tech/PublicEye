import type { ProviderInfo } from "./policy";

/**
 * CourtListener (Free Law Project) — free case law + RECAP dockets.
 * Docs: https://wiki.free.law/c/courtlistener/help/api/rest/v4/overview
 *
 * Isomorphic part: provider info, documented limits, and the budget check.
 * The network client lives in scripts/lib/courtlistener.ts (Node only).
 */
export const COURTLISTENER: ProviderInfo = {
  id: "courtlistener",
  displayName: "CourtListener REST API v4",
  costTier: "FREE_WITH_LIMITS",
  requiresNetwork: true,
  requiresApiKey: true,
  termsUrl: "https://wiki.free.law/c/courtlistener/help/api/rest/v4/overview",
};

export const COURTLISTENER_BASE = "https://www.courtlistener.com/api/rest/v4/";

/**
 * Default limits for authenticated users, rolling windows, all applied at
 * once (verified 2026-10-06). We stay one under each to leave headroom.
 */
export const COURTLISTENER_LIMITS = [
  { windowMs: 60_000, max: 5, label: "per minute" },
  { windowMs: 3_600_000, max: 50, label: "per hour" },
  { windowMs: 86_400_000, max: 125, label: "per day" },
] as const;

export type BudgetDecision =
  | { ok: true; remaining: { label: string; left: number }[] }
  | { ok: false; waitMs: number; reason: string; canWait: boolean };

/**
 * Decide whether one more live request fits every rolling window, given the
 * timestamps (ms) of past live requests. Cache hits never count.
 * `canWait` is true only for the per-minute window — waiting out an hourly or
 * daily limit inside a CLI run would be surprising, so we stop instead.
 */
export const checkBudget = (
  requestTimes: number[],
  now: number,
  limits: readonly {
    windowMs: number;
    max: number;
    label: string;
  }[] = COURTLISTENER_LIMITS,
  headroom = 1,
): BudgetDecision => {
  const remaining: { label: string; left: number }[] = [];
  for (const limit of limits) {
    const inWindow = requestTimes
      .filter((t) => now - t < limit.windowMs)
      .sort((a, b) => a - b);
    const cap = Math.max(1, limit.max - headroom);
    if (inWindow.length >= cap) {
      const oldest = inWindow[inWindow.length - cap];
      return {
        ok: false,
        waitMs: oldest + limit.windowMs - now,
        reason: `CourtListener limit reached: ${inWindow.length}/${limit.max} ${limit.label}`,
        canWait: limit.windowMs <= 60_000,
      };
    }
    remaining.push({ label: limit.label, left: cap - inWindow.length });
  }
  return { ok: true, remaining };
};

/** Compact view of an opinion search hit, for discovery listings. */
export type CaseLawHit = {
  clusterId: number;
  caseName: string;
  court: string;
  dateFiled: string;
  docketNumber?: string;
  citations: string[];
  url: string;
  opinionIds: number[];
};

type RawHit = {
  cluster_id: number;
  caseName?: string;
  caseNameFull?: string;
  court?: string;
  court_citation_string?: string;
  dateFiled?: string;
  docketNumber?: string;
  citation?: string[];
  absolute_url?: string;
  opinions?: { id: number }[];
};

export const toCaseLawHit = (raw: RawHit): CaseLawHit => ({
  clusterId: raw.cluster_id,
  caseName: raw.caseName ?? raw.caseNameFull ?? "(unnamed)",
  court: raw.court ?? raw.court_citation_string ?? "",
  dateFiled: raw.dateFiled ?? "",
  docketNumber: raw.docketNumber || undefined,
  citations: raw.citation ?? [],
  url: raw.absolute_url
    ? new URL(raw.absolute_url, "https://www.courtlistener.com").toString()
    : "",
  opinionIds: (raw.opinions ?? []).map((o) => o.id),
});
