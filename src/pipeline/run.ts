import type {
  ArtifactValidity,
  CaseWorkspace,
  PipelineStage,
  RunManifest,
  RunStage,
  StageStatus,
} from "../domain";
import {
  PIPELINE_STAGES,
  runManifestSchema,
  SCHEMA_VERSION,
  WORKSPACE_FILES,
} from "../domain";
import type { ValidationIssue } from "../validation/issues";
import { fingerprint } from "./fingerprint";
import { gateState } from "./gates";
import { STAGE_GRAPH, stageDefinition, type ArtifactKey } from "./stages";

export const createRun = (
  projectId: string,
  runId: string,
  at: string,
): RunManifest =>
  runManifestSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    kind: "run-manifest",
    runId,
    projectId,
    createdAt: at,
    updatedAt: at,
    currentStage: PIPELINE_STAGES[0],
    overallStatus: "IN_PROGRESS",
    stages: PIPELINE_STAGES.map((stage) => ({ stage, status: "PENDING" })),
  });

// ---------------------------------------------------------------------------
// Stage status transitions
// ---------------------------------------------------------------------------

const ALLOWED: Record<StageStatus, StageStatus[]> = {
  PENDING: ["READY", "BLOCKED", "SKIPPED"],
  READY: ["RUNNING", "PENDING", "BLOCKED", "SKIPPED"],
  RUNNING: ["COMPLETE", "FAILED", "NEEDS_REVIEW"],
  NEEDS_REVIEW: ["COMPLETE", "FAILED", "READY"],
  FAILED: ["READY", "BLOCKED"],
  BLOCKED: ["READY", "PENDING"],
  COMPLETE: ["READY"], // invalidated by changed inputs
  SKIPPED: ["READY"],
};

export class StageTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StageTransitionError";
  }
}

export type TransitionOptions = {
  at: string;
  error?: string;
  retryable?: boolean;
  /** Required with COMPLETE for non-gate stages: fingerprint of the inputs used. */
  inputsFingerprint?: string;
  workspace?: CaseWorkspace;
};

/**
 * Move one stage to a new status. Enforces the allowed graph, attempt limits,
 * and that gate stages only complete when their gate is APPROVED and fresh.
 * Returns a new run; never mutates.
 */
export const transitionStage = (
  run: RunManifest,
  stage: PipelineStage,
  to: StageStatus,
  opts: TransitionOptions,
): RunManifest => {
  const current = run.stages.find((s) => s.stage === stage);
  if (!current) throw new StageTransitionError(`stage ${stage} not in run`);
  if (!ALLOWED[current.status].includes(to)) {
    throw new StageTransitionError(
      `${stage}: ${current.status} → ${to} is not allowed`,
    );
  }
  const def = stageDefinition(stage);
  if (
    current.status === "FAILED" &&
    to === "READY" &&
    current.attemptCount >= current.maxAttempts
  ) {
    throw new StageTransitionError(
      `${stage}: retry limit (${current.maxAttempts}) reached — mark BLOCKED and investigate`,
    );
  }
  if (to === "COMPLETE" && def.kind === "HUMAN_GATE") {
    if (!opts.workspace)
      throw new StageTransitionError(
        `${stage}: workspace needed to verify the gate`,
      );
    const state = gateState(run, def.gate!, opts.workspace);
    if (state !== "APPROVED")
      throw new StageTransitionError(
        `${stage}: gate is ${state}, not APPROVED`,
      );
  }
  if (
    to === "COMPLETE" &&
    def.kind !== "HUMAN_GATE" &&
    !opts.inputsFingerprint
  ) {
    throw new StageTransitionError(
      `${stage}: COMPLETE requires inputsFingerprint (for staleness detection)`,
    );
  }

  const next: RunStage = { ...current, status: to };
  if (to === "RUNNING") {
    next.attemptCount = current.attemptCount + 1;
    next.startedAt = opts.at;
    next.lastError = undefined;
  }
  if (to === "COMPLETE") {
    next.completedAt = opts.at;
    next.inputsFingerprint = opts.inputsFingerprint;
  }
  if (to === "FAILED") next.lastError = opts.error ?? "unspecified failure";

  const failures =
    to === "FAILED"
      ? [
          ...run.failures,
          {
            stage,
            error: next.lastError!,
            at: opts.at,
            retryable: opts.retryable ?? true,
          },
        ]
      : run.failures;

  const updated: RunManifest = {
    ...run,
    updatedAt: opts.at,
    currentStage: stage,
    stages: run.stages.map((s) => (s.stage === stage ? next : s)),
    failures,
  };
  return { ...updated, overallStatus: overallStatus(updated) };
};

const overallStatus = (run: RunManifest): RunManifest["overallStatus"] => {
  const statuses = run.stages.map((s) => s.status);
  if (statuses.every((s) => s === "COMPLETE" || s === "SKIPPED"))
    return "COMPLETE";
  if (statuses.includes("BLOCKED")) return "BLOCKED";
  if (statuses.includes("FAILED")) return "FAILED";
  if (
    statuses.includes("NEEDS_REVIEW") ||
    run.gates.some((g) => g.status === "PENDING")
  )
    return "WAITING_FOR_HUMAN";
  return "IN_PROGRESS";
};

// ---------------------------------------------------------------------------
// Item-level selective retry
// ---------------------------------------------------------------------------

export type ItemLike = { id: string; status: string; attemptCount: number };

export type ItemPlan = {
  /** COMPLETE — never regenerate. */
  keep: string[];
  /** FAILED with attempts left. */
  retry: string[];
  /** PENDING / RUNNING (interrupted) — continue. */
  run: string[];
  /** FAILED at the attempt limit — needs a human. */
  exhausted: string[];
};

/**
 * Decide per item what a resume should do. Works for narration units,
 * assets, render chunks — anything with {id, status, attemptCount}.
 */
export const planItems = (items: ItemLike[], maxAttempts = 3): ItemPlan => {
  const plan: ItemPlan = { keep: [], retry: [], run: [], exhausted: [] };
  for (const item of items) {
    if (item.status === "COMPLETE" || item.status === "SKIPPED")
      plan.keep.push(item.id);
    else if (item.status === "FAILED")
      (item.attemptCount < maxAttempts ? plan.retry : plan.exhausted).push(
        item.id,
      );
    else plan.run.push(item.id);
  }
  return plan;
};

// ---------------------------------------------------------------------------
// Artifact validity + resume planning
// ---------------------------------------------------------------------------

const KEY_BY_PATH = new Map<string, ArtifactKey>(
  (Object.entries(WORKSPACE_FILES) as [string, string][])
    .filter(([k]) => k !== "case" && k !== "researchNotes")
    .map(([k, p]) => [p, k as ArtifactKey]),
);

/** Recompute each recorded artifact's validity against the workspace. */
export const assessArtifacts = (
  run: RunManifest,
  ws: CaseWorkspace,
  existingPaths?: Set<string>,
) =>
  run.artifacts.map((a) => {
    const key = KEY_BY_PATH.get(a.path);
    let validity: ArtifactValidity;
    if (a.validity === "FAILED") validity = "FAILED";
    else if (key) {
      const value = ws[key];
      validity =
        value === undefined
          ? "MISSING"
          : a.fingerprint && a.fingerprint !== fingerprint(value)
            ? "STALE"
            : "VALID";
    } else
      validity =
        existingPaths && !existingPaths.has(a.path) ? "MISSING" : a.validity;
    return { ...a, validity };
  });

export type ResumeAction =
  | "KEEP" // complete and inputs unchanged: do not regenerate
  | "RERUN" // complete but inputs changed: stale
  | "RETRY" // failed, attempts remain
  | "RUN" // ready to run now
  | "WAIT_FOR_HUMAN" // gate pending / needs review
  | "BLOCKED"; // prerequisites or gates missing, or retries exhausted

export type StagePlan = {
  stage: PipelineStage;
  action: ResumeAction;
  reasons: string[];
};

const issuesFor = (issues: ValidationIssue[], key: ArtifactKey) => {
  const file = WORKSPACE_FILES[key as keyof typeof WORKSPACE_FILES];
  return issues.filter(
    (i) => i.severity === "ERROR" && i.path.startsWith(file),
  );
};

/**
 * What a resume would do for every stage, in order. Pure: reads the run,
 * the workspace, and its validation issues; changes nothing. A stale
 * upstream stage makes every downstream COMPLETE stage RERUN as well.
 */
export const planResume = (
  run: RunManifest,
  ws: CaseWorkspace,
  issues: ValidationIssue[],
  opts: { existingOutputs?: Set<string> } = {},
): StagePlan[] => {
  const plans: StagePlan[] = [];
  let upstreamChanged = false;

  for (const def of STAGE_GRAPH) {
    const state = run.stages.find((s) => s.stage === def.stage)!;
    const reasons: string[] = [];

    for (const key of def.requiresArtifacts) {
      if (ws[key] === undefined)
        reasons.push(
          `missing ${WORKSPACE_FILES[key as keyof typeof WORKSPACE_FILES]}`,
        );
      else if (issuesFor(issues, key).length)
        reasons.push(
          `${WORKSPACE_FILES[key as keyof typeof WORKSPACE_FILES]} has validation errors`,
        );
    }
    for (const g of def.requiresGates) {
      const gs = gateState(run, g, ws);
      if (gs !== "APPROVED") reasons.push(`gate ${g} is ${gs}`);
    }
    if (
      def.stage === "VISUAL_PLAN" &&
      ws.alignment?.alignmentSource === "ESTIMATED"
    ) {
      reasons.push(
        "alignment is ESTIMATED — visual timing needs measured narration",
      );
    }
    if (def.stage === "RENDER") {
      const notReady = (ws.assets?.assets ?? []).filter(
        (a) =>
          (ws.manifest?.assets ?? []).some((m) => m.assetId === a.id) &&
          (a.status !== "COMPLETE" || a.approval.status !== "APPROVED"),
      );
      if (notReady.length)
        reasons.push(
          `assets not complete/approved: ${notReady.map((a) => a.id).join(", ")}`,
        );
    }
    if (
      def.stage === "TECHNICAL_QA" &&
      opts.existingOutputs &&
      !opts.existingOutputs.has("output/master.mp4")
    ) {
      reasons.push("output/master.mp4 has not been rendered");
    }

    let action: ResumeAction;
    if (def.kind === "HUMAN_GATE") {
      const gs = gateState(run, def.gate!, ws);
      if (reasons.length) action = "BLOCKED";
      else if (gs === "APPROVED" && !upstreamChanged) action = "KEEP";
      else {
        action = "WAIT_FOR_HUMAN";
        reasons.push(
          gs === "STALE"
            ? "approved content has changed — re-approval required"
            : `gate is ${gs}`,
        );
      }
    } else if (state.status === "COMPLETE") {
      const fresh = state.inputsFingerprint === fingerprint(def.inputs(ws));
      if (fresh && !upstreamChanged) action = "KEEP";
      else {
        action = reasons.length ? "BLOCKED" : "RERUN";
        reasons.push(
          fresh
            ? "an upstream stage changed"
            : "inputs changed since completion (stale)",
        );
        upstreamChanged = true;
      }
    } else if (state.status === "FAILED") {
      action =
        state.attemptCount < state.maxAttempts
          ? reasons.length
            ? "BLOCKED"
            : "RETRY"
          : "BLOCKED";
      if (state.attemptCount >= state.maxAttempts)
        reasons.push(`retry limit reached: ${state.lastError ?? ""}`);
    } else if (state.status === "NEEDS_REVIEW") {
      action = "WAIT_FOR_HUMAN";
    } else if (state.status === "SKIPPED") {
      action = "KEEP";
    } else {
      action = reasons.length ? "BLOCKED" : "RUN";
    }
    plans.push({ stage: def.stage, action, reasons });
  }
  return plans;
};

/** First stage that needs attention, or undefined when everything is KEEP. */
export const nextStep = (plans: StagePlan[]) =>
  plans.find((p) => p.action !== "KEEP");

/** Stable, human-diffable JSON. */
export const serializeRun = (run: RunManifest) =>
  `${JSON.stringify(runManifestSchema.parse(run), null, 2)}\n`;
export const deserializeRun = (json: string) =>
  runManifestSchema.parse(JSON.parse(json));
