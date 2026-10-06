/**
 * Cost policy shared by every provider family (narration, transcription,
 * research, imagery…). Paid providers are opt-in and never required.
 */
export type CostTier = "LOCAL" | "FREE" | "FREE_WITH_LIMITS" | "PAID";

export type ProviderInfo = {
  id: string;
  displayName: string;
  costTier: CostTier;
  requiresNetwork: boolean;
  requiresApiKey: boolean;
  /** Where the current terms/pricing were checked. */
  termsUrl?: string;
};

export type ProviderPolicy = { allowPaid: boolean };

export const DEFAULT_POLICY: ProviderPolicy = { allowPaid: false };

export class PaidProviderNotAllowedError extends Error {
  constructor(provider: ProviderInfo) {
    super(
      `Provider "${provider.id}" is PAID and paid providers are disabled. ` +
        `Set ALLOW_PAID_PROVIDERS=true to opt in, or choose a local/free provider.`,
    );
    this.name = "PaidProviderNotAllowedError";
  }
}

export const assertProviderAllowed = (
  provider: ProviderInfo,
  policy: ProviderPolicy = DEFAULT_POLICY,
) => {
  if (provider.costTier === "PAID" && !policy.allowPaid)
    throw new PaidProviderNotAllowedError(provider);
};

/** Pick the first allowed provider, preferring cheaper tiers. */
export const selectProvider = <P extends { info: ProviderInfo }>(
  candidates: P[],
  policy: ProviderPolicy = DEFAULT_POLICY,
): P | undefined => {
  const rank: Record<CostTier, number> = {
    LOCAL: 0,
    FREE: 1,
    FREE_WITH_LIMITS: 2,
    PAID: 3,
  };
  return [...candidates]
    .filter((p) => p.info.costTier !== "PAID" || policy.allowPaid)
    .sort((a, b) => rank[a.info.costTier] - rank[b.info.costTier])[0];
};
