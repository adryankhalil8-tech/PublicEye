import { z } from "zod";
import { idSchema, nonEmpty, schemaVersionSchema } from "./common";
import { legalStatusSchema } from "./claims";
import { dateSpecSchema } from "./timeline";

export const personRoleSchema = z.enum([
  "VICTIM",
  "SUSPECT",
  "DEFENDANT",
  "WITNESS",
  "INVESTIGATOR",
  "PROSECUTOR",
  "DEFENSE_ATTORNEY",
  "JUDGE",
  "JUROR",
  "JOURNALIST",
  "FAMILY_MEMBER",
  "OFFICIAL",
  "OTHER",
]);
export type PersonRole = z.infer<typeof personRoleSchema>;

/**
 * A legal status entry is only as good as the LEGAL_STATUS claim behind it.
 * Entries are ordered chronologically so the *latest* standing is last.
 */
export const legalStatusEntrySchema = z.object({
  matter: nonEmpty,
  status: legalStatusSchema,
  asOf: dateSpecSchema.optional(),
  claimIds: z.array(idSchema("claim")).min(1),
});
export type LegalStatusEntry = z.infer<typeof legalStatusEntrySchema>;

export const personSchema = z.object({
  id: idSchema("person"),
  name: nonEmpty,
  aliases: z.array(z.string()).default([]),
  roles: z.array(personRoleSchema).min(1),
  /** Private individuals (not officials/public figures) warrant extra care. */
  isPrivateIndividual: z.boolean(),
  /** Minors at the time of events must not be named without review. */
  wasMinorAtTime: z.boolean().default(false),
  livingStatus: z.enum(["LIVING", "DECEASED", "UNKNOWN"]),
  legalStatuses: z.array(legalStatusEntrySchema).default([]),
  claimIds: z.array(idSchema("claim")).default([]),
  notes: z.string().optional(),
});
export type Person = z.infer<typeof personSchema>;

export const organizationSchema = z.object({
  id: idSchema("organization"),
  name: nonEmpty,
  type: z.enum([
    "COURT",
    "LAW_ENFORCEMENT",
    "PROSECUTOR",
    "GOVERNMENT",
    "MEDIA",
    "BUSINESS",
    "OTHER",
  ]),
  jurisdiction: z.string().optional(),
  claimIds: z.array(idSchema("claim")).default([]),
  notes: z.string().optional(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const locationSchema = z.object({
  id: idSchema("location"),
  name: nonEmpty,
  kind: z.enum([
    "CRIME_SCENE",
    "COURTHOUSE",
    "RESIDENCE",
    "BUSINESS",
    "PUBLIC_PLACE",
    "CITY",
    "REGION",
    "OTHER",
  ]),
  /** Never store a private residence's exact address. Use city/region. */
  displayAddress: z.string().optional(),
  coordinates: z
    .object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
      /** How precisely the coordinates are known. Do not overstate. */
      precision: z.enum(["EXACT", "APPROXIMATE", "CITY", "REGION"]),
    })
    .optional(),
  claimIds: z.array(idSchema("claim")).default([]),
  notes: z.string().optional(),
});
export type Location = z.infer<typeof locationSchema>;

export const entitiesFileSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal("entities"),
  people: z.array(personSchema),
  organizations: z.array(organizationSchema),
  locations: z.array(locationSchema),
});
export type EntitiesFile = z.infer<typeof entitiesFileSchema>;
