import { z } from "zod";
import {
  confidenceSchema,
  idSchema,
  isoTimestampSchema,
  nonEmpty,
  schemaVersionSchema,
} from "./common";
import { sourceReferenceSchema } from "./sources";

/**
 * Where a person/organization stands in a legal matter. These are distinct
 * states: suspicion is not an arrest, an arrest is not a charge, a charge is
 * not a conviction, and an overturned conviction is not a conviction.
 */
export const LEGAL_STATUSES = [
  "ALLEGED",
  "SUSPECTED",
  "ACCUSED",
  "ARRESTED",
  "CHARGED",
  "INDICTED",
  "CONVICTED",
  "ACQUITTED",
  "DISMISSED",
  "OVERTURNED",
  "UNSOLVED",
  "DISPUTED",
  "UNKNOWN",
] as const;
export const legalStatusSchema = z.enum(LEGAL_STATUSES);
export type LegalStatus = z.infer<typeof legalStatusSchema>;

export const CLAIM_STATUSES = [
  "UNVERIFIED",
  "SUPPORTED",
  "DISPUTED",
  "CONTRADICTED",
  "INSUFFICIENT_EVIDENCE",
] as const;
export const claimStatusSchema = z.enum(CLAIM_STATUSES);
export type ClaimStatus = z.infer<typeof claimStatusSchema>;

/** What the claim is about (topic). */
export const claimCategorySchema = z.enum([
  "EVENT",
  "PERSON",
  "LOCATION",
  "LEGAL_PROCEEDING",
  "EVIDENCE",
  "INVESTIGATION",
  "BACKGROUND",
  "STATISTIC",
  "QUOTE",
  "AFTERMATH",
]);
export type ClaimCategory = z.infer<typeof claimCategorySchema>;

/** How central the claim is to the story. CORE claims face stricter checks. */
export const claimImportanceSchema = z.enum(["CORE", "SUPPORTING", "DETAIL"]);
export type ClaimImportance = z.infer<typeof claimImportanceSchema>;

export const attributionVerbSchema = z.enum([
  "ALLEGED",
  "CLAIMED",
  "TESTIFIED",
  "REPORTED",
  "STATED",
  "DENIED",
  "ARGUED",
  "BELIEVED",
]);
export type AttributionVerb = z.infer<typeof attributionVerbSchema>;

/**
 * The epistemic shape of a claim. This is what prevents "police alleged X"
 * from silently becoming "X happened":
 *
 * - FACT: the claim asserts that something is so.
 * - ATTRIBUTED: the claim asserts only that *someone said* something. It can
 *   be SUPPORTED (they really said it) while the underlying proposition
 *   remains unproven. Scripts must keep the attribution.
 * - LEGAL_STATUS: a subject's standing in a legal matter (charged, acquitted…).
 * - QUOTE: verbatim words from an identified speaker or document.
 */
export const claimAssertionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("FACT") }),
  z.object({
    type: z.literal("ATTRIBUTED"),
    /** Who made the assertion, e.g. "the prosecution", "Detective Sgt. …". */
    attributedTo: nonEmpty,
    verb: attributionVerbSchema,
  }),
  z.object({
    type: z.literal("LEGAL_STATUS"),
    /** Person or organization ID the status applies to. */
    subjectId: z.string().regex(/^(per|org)-/),
    legalStatus: legalStatusSchema,
    /** The specific charge/matter, e.g. "grand larceny (State v. …)". */
    matter: nonEmpty,
  }),
  z.object({
    type: z.literal("QUOTE"),
    speaker: nonEmpty,
    /** Exact words. Must appear verbatim in a supporting evidence excerpt. */
    quoteText: nonEmpty,
    context: z.string().optional(),
  }),
]);
export type ClaimAssertion = z.infer<typeof claimAssertionSchema>;

export const evidenceStanceSchema = z.enum([
  "SUPPORTS",
  "CONTRADICTS",
  "CONTEXT",
]);
export type EvidenceStance = z.infer<typeof evidenceStanceSchema>;

export const claimEvidenceSchema = z.object({
  id: idSchema("evidence"),
  stance: evidenceStanceSchema,
  reference: sourceReferenceSchema,
  notes: z.string().optional(),
});
export type ClaimEvidence = z.infer<typeof claimEvidenceSchema>;

export const claimVerificationSchema = z.object({
  /** e.g. "skill:source-verification@1" or "human:reviewer-name". */
  verifiedBy: nonEmpty,
  verifiedAt: isoTimestampSchema,
  method: z.string().optional(),
});
export type ClaimVerification = z.infer<typeof claimVerificationSchema>;

export const caseClaimSchema = z.object({
  id: idSchema("claim"),
  /** One atomic assertion, phrased neutrally and with attribution intact. */
  text: nonEmpty,
  category: claimCategorySchema,
  assertion: claimAssertionSchema,
  importance: claimImportanceSchema,
  status: claimStatusSchema,
  confidence: confidenceSchema,
  sourceIds: z.array(idSchema("source")),
  evidence: z.array(claimEvidenceSchema),
  /** Entities this claim concerns, for research navigation. */
  entityIds: z.array(z.string()).default([]),
  verification: claimVerificationSchema.optional(),
  notes: z.string().optional(),
});
export type CaseClaim = z.infer<typeof caseClaimSchema>;

export const claimsFileSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("claims"),
  claims: z.array(caseClaimSchema),
});
export type ClaimsFile = z.infer<typeof claimsFileSchema>;
