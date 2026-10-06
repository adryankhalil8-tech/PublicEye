import { exceedsCeiling, AUTHORITY_CEILING } from "../research/authority";
import {
  assessClaimSupport,
  statusExceedsEvidence,
} from "../research/verification";
import { TARGET_DURATION_RANGE_SEC } from "../storytelling/duration";
import { at, checkRefs, type ValidationContext } from "./context";

/** IDs must be unique across the entire workspace, not just per file. */
export const checkDuplicateIds = (ctx: ValidationContext) => {
  const { ws } = ctx;
  const seen = new Map<string, string>();
  const add = (id: string, where: string) => {
    const prior = seen.get(id);
    if (prior)
      ctx.c.error(
        "DUPLICATE_ID",
        where,
        `ID "${id}" is already used at ${prior}`,
      );
    else seen.set(id, where);
  };
  add(ws.project.id, at("case"));
  ws.sources.sources.forEach((s) => add(s.id, at("sources", s.id)));
  ws.claims.claims.forEach((cl) => {
    add(cl.id, at("claims", cl.id));
    cl.evidence.forEach((e) => add(e.id, at("claims", `${cl.id}/${e.id}`)));
  });
  ws.entities.people.forEach((p) => add(p.id, at("entities", p.id)));
  ws.entities.organizations.forEach((o) => add(o.id, at("entities", o.id)));
  ws.entities.locations.forEach((l) => add(l.id, at("entities", l.id)));
  ws.timeline.events.forEach((e) => add(e.id, at("timeline", e.id)));
  ws.timeline.gaps.forEach((g) => add(g.id, at("timeline", g.id)));
  ws.research.openQuestions.forEach((q) => add(q.id, at("research", q.id)));
  ws.research.contradictions.forEach((x) => add(x.id, at("research", x.id)));
  if (ws.story) {
    [ws.story.angle, ...ws.story.alternativeAngles].forEach((a) =>
      add(a.id, at("story", a.id)),
    );
    ws.story.sequences.forEach((s) => {
      add(s.id, at("story", s.id));
      s.beats.forEach((b) => add(b.id, at("story", `${s.id}/${b.id}`)));
    });
    ws.story.reveals.forEach((r) => add(r.id, at("story", r.id)));
  }
  ws.script?.units.forEach((u) => add(u.id, at("script", u.id)));
  ws.visualPlan?.assetRequirements.forEach((r) =>
    add(r.id, at("visualPlan", r.id)),
  );
  ws.visualPlan?.shots.forEach((s) => {
    add(s.id, at("visualPlan", s.id));
    s.beats.forEach((b) => add(b.id, at("visualPlan", `${s.id}/${b.id}`)));
  });
  ws.assets?.assets.forEach((a) => add(a.id, at("assets", a.id)));
};

const SYNTHETIC_HOST = /(^|\.)(example\.(invalid|com|org|net)|invalid)$/i;

export const checkProject = (ctx: ValidationContext) => {
  const { project } = ctx.ws;
  const { min, max } = TARGET_DURATION_RANGE_SEC;
  if (project.targetDurationSec < min || project.targetDurationSec > max) {
    ctx.c.warn(
      "TARGET_DURATION_OUTSIDE_RANGE",
      at("case"),
      `target ${project.targetDurationSec}s is outside the ${min}–${max}s format`,
    );
  }
  // A synthetic case must never cite real URLs (no fake facts pinned on real
  // sources), and a real case must never cite placeholder URLs.
  for (const s of ctx.ws.sources.sources) {
    const synthetic = SYNTHETIC_HOST.test(new URL(s.url).hostname);
    if (project.isSynthetic && !synthetic) {
      ctx.c.error(
        "SYNTHETIC_CASE_REAL_SOURCE",
        at("sources", s.id),
        `synthetic case cites a real URL: ${s.url}`,
      );
    }
    if (!project.isSynthetic && synthetic) {
      ctx.c.error(
        "REAL_CASE_PLACEHOLDER_SOURCE",
        at("sources", s.id),
        `real case cites a placeholder URL: ${s.url}`,
      );
    }
  }
};

export const checkSources = (ctx: ValidationContext) => {
  for (const s of ctx.ws.sources.sources) {
    if (exceedsCeiling(s)) {
      ctx.c.error(
        "AUTHORITY_ABOVE_CEILING",
        at("sources", s.id),
        `${s.sourceType} cannot be ${s.authorityLevel} (max ${AUTHORITY_CEILING[s.sourceType]})`,
      );
    }
    if (
      s.authorityLevel === "PRIMARY" &&
      !s.archivedUrl &&
      !s.recordIdentifier
    ) {
      ctx.c.info(
        "PRIMARY_SOURCE_NOT_ARCHIVED",
        at("sources", s.id),
        "add archivedUrl or recordIdentifier so the citation survives link rot",
      );
    }
  }
};

export const checkClaims = (ctx: ValidationContext) => {
  for (const claim of ctx.ws.claims.claims) {
    const path = at("claims", claim.id);
    checkRefs(ctx, claim.sourceIds, ctx.sources, "source", path);

    const listed = new Set(claim.sourceIds);
    const evidenced = new Set<string>();
    for (const e of claim.evidence) {
      const sid = e.reference.sourceId;
      evidenced.add(sid);
      if (!ctx.sources.has(sid)) {
        ctx.c.error(
          "BROKEN_SOURCE_REF",
          `${path}/${e.id}`,
          `evidence references unknown source "${sid}"`,
        );
      } else if (!listed.has(sid)) {
        ctx.c.warn(
          "EVIDENCE_SOURCE_NOT_LISTED",
          `${path}/${e.id}`,
          `evidence source "${sid}" is missing from claim.sourceIds`,
        );
      }
      const src = ctx.sources.get(sid);
      const r = e.reference;
      if (
        src?.authorityLevel === "PRIMARY" &&
        !(r.page || r.section || r.paragraph || r.timestamp || r.docketEntry)
      ) {
        ctx.c.warn(
          "EVIDENCE_WITHOUT_LOCATOR",
          `${path}/${e.id}`,
          "primary-source evidence should say where (page/section/paragraph/docket entry)",
        );
      }
    }
    for (const sid of listed) {
      if (!evidenced.has(sid))
        ctx.c.warn(
          "SOURCE_WITHOUT_EVIDENCE",
          path,
          `source "${sid}" is listed but no evidence cites it`,
        );
    }

    if (claim.entityIds.length) {
      for (const id of claim.entityIds) {
        if (
          !ctx.people.has(id) &&
          !ctx.organizations.has(id) &&
          !ctx.locations.has(id)
        ) {
          ctx.c.error(
            "BROKEN_ENTITY_REF",
            path,
            `references unknown entity "${id}"`,
          );
        }
      }
    }
    if (claim.assertion.type === "LEGAL_STATUS") {
      const sid = claim.assertion.subjectId;
      if (!ctx.people.has(sid) && !ctx.organizations.has(sid)) {
        ctx.c.error(
          "BROKEN_ENTITY_REF",
          path,
          `legal-status subject "${sid}" does not exist`,
        );
      }
    }

    const assessment = assessClaimSupport(claim, ctx.sources);
    if (statusExceedsEvidence(claim.status, assessment.maxJustifiedStatus)) {
      ctx.c.error(
        "CLAIM_STATUS_EXCEEDS_EVIDENCE",
        path,
        `marked SUPPORTED but evidence justifies at most ${assessment.maxJustifiedStatus}: ${assessment.reasons.join("; ")}`,
      );
    }
    if (claim.status === "UNVERIFIED") {
      const level = claim.importance === "CORE" ? "warn" : "info";
      ctx.c[level](
        "UNVERIFIED_CLAIM",
        path,
        "claim has not been through source verification",
      );
    }
    if (claim.status === "SUPPORTED" && !claim.verification) {
      ctx.c.info(
        "VERIFICATION_METADATA_MISSING",
        path,
        "record who verified this claim and when",
      );
    }
    if (
      claim.status === "DISPUTED" &&
      !claim.evidence.some((e) => e.stance === "CONTRADICTS")
    ) {
      ctx.c.info(
        "DISPUTED_WITHOUT_COUNTER_EVIDENCE",
        path,
        "DISPUTED claims should cite the contradicting source",
      );
    }
  }
};

export const checkEntities = (ctx: ValidationContext) => {
  for (const p of ctx.ws.entities.people) {
    const path = at("entities", p.id);
    checkRefs(ctx, p.claimIds, ctx.claims, "claim", path);
    if (p.wasMinorAtTime) {
      ctx.c.warn(
        "MINOR_INVOLVED",
        path,
        "person was a minor at the time — naming/visuals need editorial review",
      );
    }
    for (const entry of p.legalStatuses) {
      for (const cid of entry.claimIds) {
        const claim = ctx.claims.get(cid);
        if (!claim) {
          ctx.c.error(
            "BROKEN_CLAIM_REF",
            path,
            `legal status references unknown claim "${cid}"`,
          );
          continue;
        }
        const a = claim.assertion;
        if (
          a.type !== "LEGAL_STATUS" ||
          a.legalStatus !== entry.status ||
          a.subjectId !== p.id
        ) {
          ctx.c.error(
            "LEGAL_STATUS_MISMATCH",
            path,
            `status ${entry.status} cites "${cid}", which is not a LEGAL_STATUS ${entry.status} claim about ${p.id}`,
          );
        } else if (claim.status !== "SUPPORTED") {
          ctx.c.error(
            "LEGAL_STATUS_UNSUPPORTED",
            path,
            `status ${entry.status} rests on ${claim.status} claim "${cid}"`,
          );
        }
      }
    }
  }
  for (const o of ctx.ws.entities.organizations)
    checkRefs(ctx, o.claimIds, ctx.claims, "claim", at("entities", o.id));
  for (const l of ctx.ws.entities.locations) {
    checkRefs(ctx, l.claimIds, ctx.claims, "claim", at("entities", l.id));
    if (
      l.kind === "RESIDENCE" &&
      (l.coordinates?.precision === "EXACT" || l.displayAddress)
    ) {
      ctx.c.warn(
        "PRIVATE_RESIDENCE_PRECISION",
        at("entities", l.id),
        "do not publish a residence's exact address/coordinates",
      );
    }
  }
};

export const checkResearchBrief = (ctx: ValidationContext) => {
  for (const q of ctx.ws.research.openQuestions) {
    checkRefs(
      ctx,
      q.relatedClaimIds,
      ctx.claims,
      "claim",
      at("research", q.id),
    );
  }
  for (const x of ctx.ws.research.contradictions) {
    checkRefs(ctx, x.claimIds, ctx.claims, "claim", at("research", x.id));
    checkRefs(ctx, x.sourceIds, ctx.sources, "source", at("research", x.id));
  }
};
