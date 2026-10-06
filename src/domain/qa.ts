import { z } from "zod";
import {
  idSchema,
  isoTimestampSchema,
  nonEmpty,
  schemaVersionSchema,
} from "./common";

/**
 * QA status per check. MANUAL_REQUIRED means automation cannot decide —
 * a human must. It is never treated as a pass.
 */
export const qaCheckStatusSchema = z.enum([
  "PASS",
  "WARN",
  "FAIL",
  "NOT_RUN",
  "MANUAL_REQUIRED",
]);
export type QaCheckStatus = z.infer<typeof qaCheckStatusSchema>;

export const qaCategorySchema = z.enum(["TECHNICAL", "VISUAL", "EDITORIAL"]);
export type QaCategory = z.infer<typeof qaCategorySchema>;

export const qaCheckSchema = z.object({
  id: idSchema("qaCheck"),
  category: qaCategorySchema,
  name: nonEmpty,
  status: qaCheckStatusSchema,
  automated: z.boolean(),
  detail: z.string().optional(),
  /** Human who resolved a MANUAL_REQUIRED check ("human:<name>"). */
  reviewedBy: z.string().optional(),
});
export type QaCheck = z.infer<typeof qaCheckSchema>;

export const qaReportSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("qa-report"),
  caseId: idSchema("case"),
  generatedAt: isoTimestampSchema,
  /** File the technical checks ran against (e.g. output/master.mp4). */
  renderPath: z.string().optional(),
  checks: z.array(qaCheckSchema),
  /** Computed from checks (see summarizeQa); stored for human reading. */
  overall: z.enum(["PASS", "FAIL", "INCOMPLETE"]),
});
export type QaReport = z.infer<typeof qaReportSchema>;
