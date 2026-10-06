import { z } from "zod";
import {
  idSchema,
  isoTimestampSchema,
  nonEmpty,
  schemaVersionSchema,
} from "./common";
import { rightsStatusSchema } from "./sources";

export const mediaTypeSchema = z.enum([
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "DOCUMENT",
  "TEXTURE",
  "MAP_DATA",
  "FONT",
]);
export type MediaType = z.infer<typeof mediaTypeSchema>;

/** Where an asset came from. GENERATED/CREATED are never authentic evidence. */
export const assetOriginSchema = z.enum([
  "ARCHIVAL", // historical archive, library, museum
  "PUBLIC_RECORD", // court/government record
  "PRESS", // news photography / footage
  "STOCK",
  "CREATED_IN_HOUSE", // original graphics made for this project
  "REMOTION_GENERATED", // drawn at render time by a Remotion primitive
  "AI_GENERATED",
  "USER_PROVIDED",
  "OTHER",
]);

/** Origins that can never be presented as authentic evidence. */
export const NON_AUTHENTIC_ORIGINS: AssetOrigin[] = [
  "CREATED_IN_HOUSE",
  "REMOTION_GENERATED",
  "AI_GENERATED",
];

/**
 * Acquisition/production state, separate from rights approval. A resume
 * keeps COMPLETE assets, retries FAILED ones (within the attempt limit), and
 * continues PENDING ones.
 */
export const assetProductionStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETE",
  "FAILED",
  "SKIPPED",
]);
export type AssetProductionStatus = z.infer<typeof assetProductionStatusSchema>;
export type AssetOrigin = z.infer<typeof assetOriginSchema>;

export const assetRequirementSchema = z.object({
  id: idSchema("assetRequirement"),
  description: nonEmpty,
  mediaType: mediaTypeSchema,
  /** True when only a real record will do (e.g. "the actual indictment"). */
  mustBeAuthentic: z.boolean(),
  relatedClaimIds: z.array(idSchema("claim")).default([]),
  status: z.enum(["OPEN", "FULFILLED", "WAIVED"]),
  fulfilledByAssetId: idSchema("asset").optional(),
  notes: z.string().optional(),
});
export type AssetRequirement = z.infer<typeof assetRequirementSchema>;

/** Rights states from which an asset may be approved for use. */
export const APPROVABLE_RIGHTS = [
  "PUBLIC_DOMAIN",
  "LICENSED",
  "OWNED",
  "FAIR_USE_REVIEW",
] as const;

export const assetApprovalSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  /** Must be a human ("human:<name>") for FAIR_USE_REVIEW approvals. */
  approvedBy: z.string().optional(),
  approvedAt: isoTimestampSchema.optional(),
  /** Required when approving under FAIR_USE_REVIEW. */
  fairUseRationale: z.string().optional(),
  notes: z.string().optional(),
});
export type AssetApproval = z.infer<typeof assetApprovalSchema>;

export const assetRecordSchema = z.object({
  id: idSchema("asset"),
  mediaType: mediaTypeSchema,
  origin: assetOriginSchema,
  sourceUrl: z.url().optional(),
  /** Path relative to assets/ (the Remotion public dir). */
  localPath: nonEmpty,
  sourceOrganization: z.string().optional(),
  creator: z.string().optional(),
  rightsStatus: rightsStatusSchema,
  license: z.string().optional(),
  creditRequired: z.boolean(),
  creditText: z.string().optional(),
  retrievedAt: isoTimestampSchema.optional(),
  /** Case source this asset reproduces (e.g. a scanned court filing). */
  caseSourceId: idSchema("source").optional(),
  approval: assetApprovalSchema,
  /** Shot that first needed this asset (assets can be reused). */
  shotId: idSchema("shot").optional(),
  status: assetProductionStatusSchema.default("PENDING"),
  attemptCount: z.number().int().min(0).default(0),
  lastError: z.string().optional(),
  createdAt: isoTimestampSchema.optional(),
  updatedAt: isoTimestampSchema.optional(),
  /** Estimated cost if a paid provider would produce it. Free-first: 0. */
  estimatedCostUsd: z.number().min(0).default(0),
  notes: z.string().optional(),
});
export type AssetRecord = z.infer<typeof assetRecordSchema>;

export const assetsFileSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("assets"),
  assets: z.array(assetRecordSchema),
});
export type AssetsFile = z.infer<typeof assetsFileSchema>;
