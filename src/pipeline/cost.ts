import type { CostApproval, RunManifest } from "../domain";
import type { ProviderInfo, ProviderPolicy } from "../providers/policy";
import { assertProviderAllowed, DEFAULT_POLICY } from "../providers/policy";

export class CostApprovalRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostApprovalRequiredError";
  }
}

/**
 * Gate every paid operation. Free/local providers pass straight through.
 * A PAID provider needs BOTH the environment opt-in (policy.allowPaid) AND a
 * human-approved CostApproval in the run covering these exact jobs at or
 * above the estimate. There is no path to an unattended paid request.
 */
export const assertPaidOperationApproved = (
  run: RunManifest,
  provider: ProviderInfo,
  jobs: string[],
  estimatedUsd: number,
  policy: ProviderPolicy = DEFAULT_POLICY,
): CostApproval | null => {
  if (provider.costTier !== "PAID") return null;
  assertProviderAllowed(provider, policy);
  const approval = run.costApprovals.find(
    (c) =>
      c.providerId === provider.id &&
      c.status === "APPROVED" &&
      /^human:\S/.test(c.resolvedBy ?? "") &&
      c.estimatedUsd >= estimatedUsd &&
      jobs.every((j) => c.jobs.includes(j)),
  );
  if (!approval) {
    throw new CostApprovalRequiredError(
      `Paid operation on "${provider.id}" (${jobs.length} job(s), est. $${estimatedUsd.toFixed(2)}) ` +
        `needs a human-approved cost approval in the run listing these jobs.`,
    );
  }
  return approval;
};

/** Total estimated spend for a run's assets — free-first, so normally 0. */
export const estimateRunCostUsd = (assetCosts: number[]) =>
  assetCosts.reduce((s, c) => s + c, 0);
