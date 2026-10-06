import { z } from "zod";
import {
  idSchema,
  isoTimestampSchema,
  nonEmpty,
  schemaVersionSchema,
} from "./common";

/**
 * Production stages in dependency order. The graph (inputs, outputs, gates,
 * skills) lives in src/pipeline/stages.ts; this is just the vocabulary.
 */
export const PIPELINE_STAGES = [
  "RESEARCH",
  "VERIFICATION",
  "TIMELINE",
  "GATE_RESEARCH",
  "STORY",
  "SCRIPT",
  "GATE_SCRIPT",
  "NARRATION",
  "ALIGNMENT",
  "VISUAL_BIBLE",
  "VISUAL_PLAN",
  "GATE_PRE_PRODUCTION",
  "ASSETS",
  "RENDER",
  "TECHNICAL_QA",
  "EDITORIAL_QA",
  "CAPTIONS",
  "PACKAGE",
  "GATE_PUBLICATION",
] as const;
export const pipelineStageSchema = z.enum(PIPELINE_STAGES);
export type PipelineStage = z.infer<typeof pipelineStageSchema>;

export const STAGE_STATUSES = [
  "PENDING", // prerequisites not yet met
  "READY", // prerequisites met, can run
  "RUNNING",
  "COMPLETE",
  "FAILED",
  "BLOCKED", // cannot proceed (failed prerequisite, rejected gate, exhausted retries)
  "SKIPPED", // deliberately not run (e.g. optional stage)
  "NEEDS_REVIEW", // produced output that a human must look at
] as const;
export const stageStatusSchema = z.enum(STAGE_STATUSES);
export type StageStatus = z.infer<typeof stageStatusSchema>;

/** Health of a recorded artifact relative to its current inputs. */
export const artifactValiditySchema = z.enum([
  "VALID",
  "STALE",
  "FAILED",
  "MISSING",
]);
export type ArtifactValidity = z.infer<typeof artifactValiditySchema>;

export const runItemSchema = z.object({
  id: nonEmpty,
  status: z.enum(["PENDING", "RUNNING", "COMPLETE", "FAILED", "SKIPPED"]),
  attemptCount: z.number().int().min(0),
  lastError: z.string().optional(),
  updatedAt: isoTimestampSchema.optional(),
});
export type RunItem = z.infer<typeof runItemSchema>;

export const runStageSchema = z.object({
  stage: pipelineStageSchema,
  status: stageStatusSchema,
  attemptCount: z.number().int().min(0).default(0),
  maxAttempts: z.number().int().positive().default(3),
  startedAt: isoTimestampSchema.optional(),
  completedAt: isoTimestampSchema.optional(),
  lastError: z.string().optional(),
  /** Fingerprint of the stage's inputs when it last COMPLETED. */
  inputsFingerprint: z.string().optional(),
  /** Per-item work (narration units, assets, render chunks…). */
  items: z.array(runItemSchema).default([]),
  notes: z.string().optional(),
});
export type RunStage = z.infer<typeof runStageSchema>;

export const runArtifactSchema = z.object({
  /** Workspace-relative path. */
  path: nonEmpty,
  producedBy: pipelineStageSchema,
  /** Fingerprint of the artifact content when recorded. */
  fingerprint: z.string().optional(),
  validity: artifactValiditySchema,
  recordedAt: isoTimestampSchema,
});
export type RunArtifact = z.infer<typeof runArtifactSchema>;

export const runFailureSchema = z.object({
  stage: pipelineStageSchema,
  itemId: z.string().optional(),
  error: nonEmpty,
  at: isoTimestampSchema,
  retryable: z.boolean(),
});
export type RunFailure = z.infer<typeof runFailureSchema>;

// ---------------------------------------------------------------------------
// Human approval gates
// ---------------------------------------------------------------------------

/**
 * Three major human gates. Gate 2 is split into two sign-offs because
 * narration needs an approved script before visuals exist:
 *   RESEARCH         Gate 1   before storytelling is finalized
 *   SCRIPT           Gate 2a  before narration is produced
 *   PRE_PRODUCTION   Gate 2b  before asset acquisition / render
 *   PUBLICATION      Gate 3   before publishing
 */
export const GATE_TYPES = [
  "RESEARCH",
  "SCRIPT",
  "PRE_PRODUCTION",
  "PUBLICATION",
] as const;
export const gateTypeSchema = z.enum(GATE_TYPES);
export type GateType = z.infer<typeof gateTypeSchema>;

export const gateStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED",
]);
export type GateStatus = z.infer<typeof gateStatusSchema>;

export const gateChecklistItemSchema = z.object({
  id: nonEmpty,
  question: nonEmpty,
  answer: z.enum(["YES", "NO", "NA"]).optional(),
  note: z.string().optional(),
});
export type GateChecklistItem = z.infer<typeof gateChecklistItemSchema>;

export const approvalGateSchema = z.object({
  id: idSchema("gate"),
  runId: idSchema("run"),
  type: gateTypeSchema,
  status: gateStatusSchema,
  requestedAt: isoTimestampSchema,
  resolvedAt: isoTimestampSchema.optional(),
  /** Must be a human: "human:<name>". Agents never resolve gates. */
  resolvedBy: z.string().optional(),
  /**
   * Fingerprint of what was reviewed. If the reviewed artifacts change after
   * approval, the approval is stale and the gate must be re-approved.
   */
  subjectFingerprint: nonEmpty,
  checklist: z.array(gateChecklistItemSchema).min(1),
  blockingIssues: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type ApprovalGate = z.infer<typeof approvalGateSchema>;

// ---------------------------------------------------------------------------
// Cost gate (free-first: normally $0)
// ---------------------------------------------------------------------------

export const costApprovalSchema = z.object({
  id: idSchema("costApproval"),
  providerId: nonEmpty,
  /** Jobs/assets the spend covers. Shown to the human before approval. */
  jobs: z.array(nonEmpty).min(1),
  estimatedUsd: z.number().min(0),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  requestedAt: isoTimestampSchema,
  resolvedAt: isoTimestampSchema.optional(),
  resolvedBy: z.string().optional(),
  notes: z.string().optional(),
});
export type CostApproval = z.infer<typeof costApprovalSchema>;

// ---------------------------------------------------------------------------
// Run manifest
// ---------------------------------------------------------------------------

export const overallRunStatusSchema = z.enum([
  "IN_PROGRESS",
  "WAITING_FOR_HUMAN",
  "BLOCKED",
  "FAILED",
  "COMPLETE",
]);
export type OverallRunStatus = z.infer<typeof overallRunStatusSchema>;

/**
 * runs/<run-id>.json — resumable production state for one attempt at
 * producing a case. Plain JSON on disk: inspectable, diffable, no database.
 */
export const runManifestSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("run-manifest"),
  runId: idSchema("run"),
  projectId: idSchema("case"),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  currentStage: pipelineStageSchema,
  overallStatus: overallRunStatusSchema,
  stages: z.array(runStageSchema),
  artifacts: z.array(runArtifactSchema).default([]),
  failures: z.array(runFailureSchema).default([]),
  gates: z.array(approvalGateSchema).default([]),
  costApprovals: z.array(costApprovalSchema).default([]),
  cost: z
    .object({
      estimatedUsd: z.number().min(0),
      approvedUsd: z.number().min(0),
      spentUsd: z.number().min(0),
    })
    .default({ estimatedUsd: 0, approvedUsd: 0, spentUsd: 0 }),
});
export type RunManifest = z.infer<typeof runManifestSchema>;
