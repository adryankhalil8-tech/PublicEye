import { APPROVABLE_RIGHTS, NON_AUTHENTIC_ORIGINS } from "../domain";
import { fingerprint } from "../pipeline/fingerprint";
import {
  computeShotTimings,
  resolveBeatFrames,
  timingFor,
} from "../production/timing";
import { at, checkRefs, type ValidationContext } from "./context";

/** A shot this long with no visual states is probably a static slide. */
const LONG_STATIC_SHOT_SEC = 12;

export const checkVisualPlan = (ctx: ValidationContext) => {
  const plan = ctx.ws.visualPlan;
  if (!plan) return;
  if (!ctx.ws.script) {
    ctx.c.error(
      "MISSING_UPSTREAM",
      at("visualPlan"),
      "a visual plan requires script.json",
    );
    return;
  }
  const scriptOrder = new Map(ctx.ws.script.units.map((u, i) => [u.id, i]));
  const shotOfNarration = new Map<string, string>();
  let lastNarrationIndex = -1;

  for (const shot of plan.shots) {
    const path = at("visualPlan", shot.id);
    checkRefs(ctx, [shot.sequenceId], ctx.sequences, "sequence", path);
    checkRefs(ctx, shot.narrationIds, ctx.narration, "narration", path);
    checkRefs(
      ctx,
      shot.assetRequirementIds,
      ctx.requirements,
      "assetRequirement",
      path,
    );
    checkRefs(ctx, shot.citationSourceIds, ctx.sources, "source", path);

    for (const nid of shot.narrationIds) {
      const prior = shotOfNarration.get(nid);
      if (prior)
        ctx.c.error(
          "NARRATION_IN_MULTIPLE_SHOTS",
          path,
          `narration "${nid}" is already covered by "${prior}"`,
        );
      shotOfNarration.set(nid, shot.id);
      const unit = ctx.narration.get(nid);
      if (unit && unit.sequenceId !== shot.sequenceId) {
        ctx.c.warn(
          "SHOT_SEQUENCE_MISMATCH",
          path,
          `narration "${nid}" belongs to ${unit.sequenceId}, shot is in ${shot.sequenceId}`,
        );
      }
      const idx = scriptOrder.get(nid);
      if (idx !== undefined) {
        if (idx < lastNarrationIndex)
          ctx.c.error(
            "SHOT_ORDER",
            path,
            `narration "${nid}" plays earlier than the previous shot's narration`,
          );
        lastNarrationIndex = Math.max(lastNarrationIndex, idx);
      }
    }

    for (const b of shot.beats) {
      if (b.atNarrationId && !shot.narrationIds.includes(b.atNarrationId)) {
        ctx.c.error(
          "BEAT_OUTSIDE_SHOT",
          `${path}/${b.id}`,
          `beat anchors to "${b.atNarrationId}", which is not in this shot`,
        );
      }
      checkRefs(ctx, b.claimIds, ctx.claims, "claim", `${path}/${b.id}`);
    }

    for (const t of shot.onScreenText) {
      checkRefs(ctx, t.claimIds, ctx.claims, "claim", path);
      if (
        ["DATE", "NAME", "QUOTE", "LOCATION"].includes(t.role) &&
        t.claimIds.length === 0
      ) {
        ctx.c.warn(
          "ONSCREEN_TEXT_UNSOURCED",
          path,
          `on-screen ${t.role} "${t.text}" has no claim link`,
        );
      }
      for (const id of t.claimIds) {
        const status = ctx.claims.get(id)?.status;
        if (status === "UNVERIFIED" || status === "CONTRADICTED") {
          ctx.c.error(
            "ONSCREEN_TEXT_UNSUPPORTED",
            path,
            `on-screen text "${t.text}" relies on ${status} claim "${id}"`,
          );
        }
      }
    }

    for (const sid of shot.citationSourceIds) {
      if (ctx.sources.get(sid)?.authorityLevel === "DISCOVERY_ONLY") {
        ctx.c.warn(
          "CITES_DISCOVERY_SOURCE",
          path,
          `on-screen citation of DISCOVERY_ONLY source "${sid}"`,
        );
      }
    }

    // Reconstructions must be labeled; generated media must never pose as evidence.
    if (
      shot.shotType === "RECONSTRUCTION" &&
      shot.representation.type !== "ILLUSTRATIVE"
    ) {
      ctx.c.error(
        "RECONSTRUCTION_UNLABELED",
        path,
        "RECONSTRUCTION shots need an ILLUSTRATIVE representation label",
      );
    }
    for (const rid of shot.assetRequirementIds) {
      const req = ctx.requirements.get(rid);
      const asset = req?.fulfilledByAssetId
        ? ctx.assets.get(req.fulfilledByAssetId)
        : undefined;
      if (!asset) continue;
      const nonAuthentic =
        NON_AUTHENTIC_ORIGINS.includes(asset.origin) &&
        asset.mediaType !== "TEXTURE";
      if (nonAuthentic && shot.representation.type === "AUTHENTIC") {
        ctx.c.error(
          "SYNTHETIC_ASSET_AS_AUTHENTIC",
          path,
          `${asset.origin} asset "${asset.id}" is shown as AUTHENTIC — label it`,
        );
      }
      if (
        asset.origin === "AI_GENERATED" &&
        shot.representation.type === "ILLUSTRATIVE" &&
        shot.representation.label !== "AI_GENERATED_RECONSTRUCTION"
      ) {
        ctx.c.error(
          "AI_LABEL_REQUIRED",
          path,
          `AI-generated asset "${asset.id}" requires the "AI-generated reconstruction" label`,
        );
      }
      if (
        req?.mustBeAuthentic &&
        NON_AUTHENTIC_ORIGINS.includes(asset.origin)
      ) {
        ctx.c.error(
          "AUTHENTIC_REQUIREMENT_VIOLATED",
          path,
          `requirement "${rid}" needs an authentic record, got ${asset.origin}`,
        );
      }
    }
  }

  // Visual-state timing: every state must land inside its shot.
  const { spans, totalMs, measured } = timingFor(ctx.ws);
  const fps = ctx.ws.manifest?.render.fps ?? 30;
  const timings = computeShotTimings(plan, spans, fps, totalMs);
  plan.shots.forEach((shot, i) => {
    const t = timings[i];
    const path = at("visualPlan", shot.id);
    for (const r of resolveBeatFrames(shot, t.startFrame, spans, fps)) {
      if (r.atFrame >= t.durationInFrames) {
        ctx.c.error(
          "BEAT_OUTSIDE_SHOT_DURATION",
          `${path}/${r.beatId}`,
          `state lands at frame ${r.atFrame} of a ${t.durationInFrames}-frame shot (${measured ? "measured" : "estimated"} timing)`,
        );
      }
    }
    if (shot.durationSec !== undefined) {
      ctx.c.warn(
        "SHOT_DURATION_OVERRIDE_IGNORED",
        path,
        "durationSec is ignored: shots are cut on the narration timeline",
      );
    }
    const stateful = shot.beats.filter((b) => b.state).length;
    if (t.durationInFrames / fps > LONG_STATIC_SHOT_SEC && stateful === 0) {
      ctx.c.info(
        "LONG_STATIC_SHOT",
        path,
        `${(t.durationInFrames / fps).toFixed(1)}s with no visual states — consider states if the viewer needs new information`,
      );
    }
  });

  for (const unit of ctx.ws.script.units) {
    if (!shotOfNarration.has(unit.id)) {
      ctx.c.warn(
        "NARRATION_NOT_COVERED",
        at("script", unit.id),
        "no shot covers this narration unit",
      );
    }
  }

  for (const req of plan.assetRequirements) {
    const path = at("visualPlan", req.id);
    checkRefs(ctx, req.relatedClaimIds, ctx.claims, "claim", path);
    if (req.status === "FULFILLED" && !req.fulfilledByAssetId) {
      ctx.c.error(
        "REQUIREMENT_FULFILLED_WITHOUT_ASSET",
        path,
        "FULFILLED requirement must name fulfilledByAssetId",
      );
    }
    if (req.fulfilledByAssetId)
      checkRefs(ctx, [req.fulfilledByAssetId], ctx.assets, "asset", path);
  }
};

export const checkAssets = (ctx: ValidationContext) => {
  for (const a of ctx.ws.assets?.assets ?? []) {
    const path = at("assets", a.id);
    if (a.caseSourceId)
      checkRefs(ctx, [a.caseSourceId], ctx.sources, "source", path);

    if (a.approval.status === "APPROVED") {
      if (!(APPROVABLE_RIGHTS as readonly string[]).includes(a.rightsStatus)) {
        ctx.c.error(
          "ASSET_APPROVED_WITHOUT_RIGHTS",
          path,
          `cannot approve an asset with rights ${a.rightsStatus}`,
        );
      }
      if (
        a.rightsStatus === "FAIR_USE_REVIEW" &&
        (!a.approval.fairUseRationale ||
          !a.approval.approvedBy?.startsWith("human:"))
      ) {
        ctx.c.error(
          "FAIR_USE_NEEDS_HUMAN",
          path,
          "fair-use approval requires a human approver and a written rationale",
        );
      }
      if (!a.approval.approvedBy || !a.approval.approvedAt) {
        ctx.c.error(
          "APPROVAL_INCOMPLETE",
          path,
          "approved assets must record approvedBy and approvedAt",
        );
      }
    }
    if (a.rightsStatus === "UNKNOWN")
      ctx.c.warn(
        "ASSET_RIGHTS_UNKNOWN",
        path,
        "rights UNKNOWN — cannot be approved until resolved",
      );
    if (a.creditRequired && !a.creditText)
      ctx.c.error(
        "ASSET_CREDIT_MISSING",
        path,
        "creditRequired but no creditText",
      );
    if (a.status === "FAILED" && !a.lastError) {
      ctx.c.warn(
        "ASSET_FAILURE_UNEXPLAINED",
        path,
        "FAILED asset should record lastError",
      );
    }
    if (
      a.status === "COMPLETE" &&
      a.attemptCount === 0 &&
      a.origin !== "REMOTION_GENERATED"
    ) {
      ctx.c.info(
        "ASSET_ATTEMPTS_UNRECORDED",
        path,
        "COMPLETE asset records no attempts",
      );
    }
    if (a.estimatedCostUsd > 0) {
      ctx.c.warn(
        "PAID_ASSET",
        path,
        `estimated ${a.estimatedCostUsd.toFixed(2)} — requires a human-approved cost approval before production`,
      );
    }
    if (
      ![...NON_AUTHENTIC_ORIGINS, "USER_PROVIDED"].includes(a.origin) &&
      !a.sourceUrl
    ) {
      ctx.c.warn(
        "ASSET_PROVENANCE_INCOMPLETE",
        path,
        "third-party asset has no sourceUrl",
      );
    }
  }
};

export const checkManifest = (ctx: ValidationContext) => {
  const m = ctx.ws.manifest;
  if (!m) return;
  const path = at("manifest");
  if (m.caseId !== ctx.ws.project.id)
    ctx.c.error(
      "MANIFEST_CASE_MISMATCH",
      path,
      `manifest is for "${m.caseId}"`,
    );
  if (m.isSynthetic !== ctx.ws.project.isSynthetic)
    ctx.c.error(
      "MANIFEST_SYNTHETIC_MISMATCH",
      path,
      "isSynthetic differs from case.json",
    );

  let expected = 0;
  for (const s of m.shots) {
    checkRefs(ctx, [s.shotId], ctx.shots, "shot", path);
    checkRefs(ctx, s.assetIds, ctx.assets, "asset", path);
    if (s.startFrame !== expected)
      ctx.c.error(
        "MANIFEST_TIMING_GAP",
        `${path}#${s.shotId}`,
        `starts at ${s.startFrame}, expected ${expected}`,
      );
    expected = s.startFrame + s.durationInFrames;
  }
  if (expected !== m.render.durationInFrames) {
    ctx.c.error(
      "MANIFEST_DURATION_MISMATCH",
      path,
      `shots end at frame ${expected}, render declares ${m.render.durationInFrames}`,
    );
  }

  for (const entry of m.assets) {
    const record = ctx.assets.get(entry.assetId);
    if (!record) continue; // reported via shot refs / below
    const approved = record.approval.status === "APPROVED";
    if (
      entry.approved !== approved ||
      entry.rightsStatus !== record.rightsStatus
    ) {
      ctx.c.error(
        "MANIFEST_ASSET_STALE",
        path,
        `asset "${entry.assetId}" rights/approval differ from assets.json`,
      );
    }
    if (m.stage !== "DRAFT" && record.status !== "COMPLETE") {
      ctx.c.error(
        "ASSET_NOT_PRODUCED",
        path,
        `${m.stage} manifest uses asset "${entry.assetId}" with status ${record.status}`,
      );
    }
    if (m.stage === "FINAL" && !approved) {
      ctx.c.error(
        "FINAL_WITH_UNAPPROVED_ASSET",
        path,
        `FINAL manifest includes unapproved asset "${entry.assetId}"`,
      );
    }
  }
  if (
    m.stage !== "DRAFT" &&
    ctx.ws.narration &&
    !ctx.ws.narration.producedFromApprovedScript
  ) {
    ctx.c.error(
      "MANIFEST_DRAFT_NARRATION",
      path,
      `${m.stage} manifest uses narration produced before the SCRIPT gate was approved`,
    );
  }
  if (m.stage !== "DRAFT" && m.timingSource !== "AUDIO") {
    ctx.c.error(
      "MANIFEST_TIMING_NOT_MEASURED",
      path,
      `${m.stage} manifests must be timed to measured narration`,
    );
  }
  if (
    ctx.ws.visualBible &&
    m.visualBibleRevision !== ctx.ws.visualBible.revision
  ) {
    ctx.c.error(
      "MANIFEST_STALE_BIBLE",
      path,
      `built for bible rev ${m.visualBibleRevision ?? "none"}, current is rev ${ctx.ws.visualBible.revision}`,
    );
  }
  if (m.stage === "FINAL" && ctx.ws.qaReport?.overall !== "PASS") {
    ctx.c.error(
      "FINAL_QA_NOT_PASSED",
      path,
      `FINAL requires output/qa-report.json overall PASS (is ${ctx.ws.qaReport?.overall ?? "missing"})`,
    );
  }
  if (m.stage === "FINAL") {
    if (
      m.qc.factQc !== "PASSED" ||
      m.qc.visualQc !== "PASSED" ||
      m.qc.humanApproval.status !== "PASSED"
    ) {
      ctx.c.error(
        "FINAL_WITHOUT_QC",
        path,
        "FINAL manifest requires fact QC, visual QC, and human approval to have PASSED",
      );
    }
    if (m.timingSource !== "AUDIO")
      ctx.c.error(
        "FINAL_WITH_ESTIMATED_TIMING",
        path,
        "FINAL renders must be timed to real narration audio",
      );
  }

  // Stale: the manifest records fingerprints of what it was built from.
  if (m.inputs && ctx.ws.script && ctx.ws.visualPlan) {
    const stale: string[] = [];
    if (m.inputs.script !== fingerprint(ctx.ws.script)) stale.push("script");
    if (m.inputs.visualPlan !== fingerprint(ctx.ws.visualPlan))
      stale.push("visual plan");
    if (
      (m.inputs.alignment ?? null) !==
      (ctx.ws.alignment ? fingerprint(ctx.ws.alignment) : null)
    )
      stale.push("alignment");
    if (
      (m.inputs.visualBible ?? null) !==
      (ctx.ws.visualBible ? fingerprint(ctx.ws.visualBible) : null)
    )
      stale.push("visual bible");
    if (stale.length) {
      ctx.c.warn(
        "MANIFEST_STALE",
        path,
        `changed since the manifest was built: ${stale.join(", ")} — rebuild it`,
      );
    }
  } else if (!m.inputs) {
    ctx.c.warn(
      "MANIFEST_STALE",
      path,
      "manifest records no input fingerprints — rebuild it",
    );
  }
};
