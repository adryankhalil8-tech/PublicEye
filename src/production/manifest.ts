import {
  productionManifestSchema,
  RENDER_DEFAULTS,
  SCHEMA_VERSION,
  type CaseWorkspace,
  type ProductionManifest,
} from "../domain";
import { fingerprint } from "../pipeline/fingerprint";
import { countBySeverity, validateWorkspace } from "../validation";
import { computeShotTimings, resolveBeatFrames, timingFor } from "./timing";

export type BuildManifestOptions = {
  stage?: ProductionManifest["stage"];
  /** Injected for deterministic output (tests, reproducible builds). */
  generatedAt: string;
};

/**
 * Resolve a workspace into a render-ready manifest. Shots and visual states
 * are timed from MEASURED narration when it exists; otherwise from word-count
 * estimates, which validation only allows at DRAFT stage.
 * Only assets referenced by shots are included.
 */
export const buildManifest = (
  ws: CaseWorkspace,
  opts: BuildManifestOptions,
): ProductionManifest => {
  if (!ws.script || !ws.visualPlan) {
    throw new Error("buildManifest requires script.json and visual-plan.json");
  }
  const { fps, width, height } = RENDER_DEFAULTS;
  const { spans, totalMs, measured } = timingFor(ws);
  const timings = computeShotTimings(ws.visualPlan, spans, fps, totalMs);

  const requirements = new Map(
    ws.visualPlan.assetRequirements.map((r) => [r.id, r]),
  );
  const assetsById = new Map((ws.assets?.assets ?? []).map((a) => [a.id, a]));

  const shots = ws.visualPlan.shots.map((shot, i) => {
    const assetIds = shot.assetRequirementIds
      .map((rid) => requirements.get(rid)?.fulfilledByAssetId)
      .filter((id): id is string => !!id && assetsById.has(id));
    return {
      shotId: shot.id,
      sequenceId: shot.sequenceId,
      shotType: shot.shotType,
      representation: shot.representation,
      startFrame: timings[i].startFrame,
      durationInFrames: timings[i].durationInFrames,
      narrationIds: shot.narrationIds,
      assetIds,
      states: resolveBeatFrames(shot, timings[i].startFrame, spans, fps),
    };
  });

  const usedAssetIds = [...new Set(shots.flatMap((s) => s.assetIds))];
  const assets = usedAssetIds.map((id) => {
    const a = assetsById.get(id)!;
    return {
      assetId: a.id,
      localPath: a.localPath,
      rightsStatus: a.rightsStatus,
      approved: a.approval.status === "APPROVED",
      creditText: a.creditText,
    };
  });

  const durationInFrames = shots.reduce(
    (sum, s) => sum + s.durationInFrames,
    0,
  );
  // Validate everything except the (not-yet-written) manifest itself.
  const counts = countBySeverity(
    validateWorkspace({ ...ws, manifest: undefined }),
  );
  const n = ws.narration;

  const manifest: ProductionManifest = {
    schemaVersion: SCHEMA_VERSION,
    kind: "production-manifest",
    caseId: ws.project.id,
    isSynthetic: ws.project.isSynthetic,
    stage: opts.stage ?? "DRAFT",
    generatedAt: opts.generatedAt,
    render: { width, height, fps, durationInFrames },
    timingSource: measured ? "AUDIO" : "ESTIMATED",
    alignmentSource: ws.alignment?.alignmentSource,
    narration:
      measured && n?.audioPath && n.durationSec !== undefined
        ? {
            narrationId: n.id,
            audioPath: n.audioPath,
            durationSec: n.durationSec,
          }
        : undefined,
    visualBibleRevision: ws.visualBible?.revision,
    inputs: {
      script: fingerprint(ws.script),
      visualPlan: fingerprint(ws.visualPlan),
      alignment: ws.alignment ? fingerprint(ws.alignment) : undefined,
      visualBible: ws.visualBible ? fingerprint(ws.visualBible) : undefined,
    },
    shots,
    assets,
    credits: assets.map((a) => a.creditText).filter((t): t is string => !!t),
    qc: {
      factQc: "PENDING",
      visualQc: "PENDING",
      humanApproval: { status: "PENDING" },
    },
    validation: { errors: counts.errors, warnings: counts.warnings },
  };
  return productionManifestSchema.parse(manifest);
};

/** Stable, human-diffable JSON (2-space indent, trailing newline). */
export const serializeManifest = (m: ProductionManifest) =>
  `${JSON.stringify(m, null, 2)}\n`;

export const deserializeManifest = (json: string): ProductionManifest =>
  productionManifestSchema.parse(JSON.parse(json));
