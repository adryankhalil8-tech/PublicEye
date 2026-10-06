/**
 * Produce, measure, and align narration for a case — free and local.
 *
 *   npm run narrate -- <case> [--voice="Microsoft David Desktop"] [--draft]
 *                             [--simulate-failure=nu-003]
 *
 * - Requires the SCRIPT gate to be APPROVED in the latest run. Pass --draft
 *   to produce timing-only narration from an unapproved script; it is marked
 *   producedFromApprovedScript=false and can never time a REVIEW/FINAL render.
 * - Idempotent per unit: a COMPLETE take whose text is unchanged and whose
 *   file exists is kept. FAILED takes are retried (up to 3 attempts);
 *   PENDING ones continue. Nothing else is regenerated.
 * - When every take is COMPLETE, takes are joined with the script's
 *   pauseAfterSec as real silence, the result is MEASURED from the file, and
 *   an exact PER_UNIT_SYNTHESIS alignment is written.
 * - --simulate-failure makes one unit fail, to exercise selective retry.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  narrationArtifactSchema,
  SCHEMA_VERSION,
  WORKSPACE_FILES,
  type NarrationArtifact,
  type NarrationUnitAudio,
} from "../src/domain";
import { fingerprint } from "../src/pipeline/fingerprint";
import { gateState } from "../src/pipeline/gates";
import { planItems } from "../src/pipeline/run";
import { joinWavs } from "../src/production/wav";
import { alignmentFromSpans } from "../src/providers/alignment";
import { assertProviderAllowed } from "../src/providers/policy";
import { SystemNarrationProvider } from "./lib/system-tts";
import {
  ASSETS_DIR,
  flag,
  latestRun,
  loadWorkspace,
  resolveCaseDir,
  writeJson,
} from "./lib/workspace-fs";

const MAX_ATTEMPTS = 3;
const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
if (!target) {
  console.error(
    'usage: npm run narrate -- <case> [--voice="…"] [--draft] [--simulate-failure=<unit-id>]',
  );
  process.exit(2);
}
const draft = flag(args, "draft") === "true";
const simulateFailure = flag(args, "simulate-failure");
const now = () => new Date().toISOString();

const dir = resolveCaseDir(target);
const report = loadWorkspace(dir);
const ws = report.workspace;
if (!ws?.script) {
  console.error("No valid script.json — narration needs a script.");
  process.exit(1);
}
const scriptErrors = report.issues.filter(
  (i) => i.severity === "ERROR" && i.path.startsWith(WORKSPACE_FILES.script),
);
if (scriptErrors.length) {
  console.error(
    "script.json has validation errors; fix them before narrating.",
  );
  process.exit(1);
}

const run = latestRun(dir);
const scriptGate = run ? gateState(run, "SCRIPT", ws) : "MISSING";
if (scriptGate !== "APPROVED" && !draft) {
  console.error(
    `SCRIPT gate is ${scriptGate}. Final narration needs an approved script.\nRun with --draft for timing-only narration.`,
  );
  process.exit(1);
}

const provider = new SystemNarrationProvider(flag(args, "voice"));
assertProviderAllowed(provider.info);
if (!(await provider.isAvailable())) {
  console.error(
    "Windows SAPI is not available on this machine. (Piper provider: planned.)",
  );
  process.exit(1);
}

const caseId = ws.project.id;
const unitsDir = `audio/${caseId}/units`;
const scriptFp = fingerprint(ws.script);
const prior = ws.narration;

if (
  prior?.status === "MEASURED" &&
  prior.scriptFingerprint === scriptFp &&
  prior.audioPath &&
  existsSync(path.join(ASSETS_DIR, prior.audioPath)) &&
  ws.alignment?.narrationId === prior.id &&
  prior.producedFromApprovedScript === (scriptGate === "APPROVED")
) {
  console.log(
    `Narration is MEASURED and current (${prior.durationSec}s) — nothing to regenerate.`,
  );
  process.exit(0);
}

// Carry over prior takes; mark takes for changed text as PENDING again.
const takes: NarrationUnitAudio[] = ws.script.units.map((u) => {
  const old = prior?.units.find((t) => t.narrationUnitId === u.id);
  const textFingerprint = fingerprint(u.text);
  const fileOk =
    old?.audioPath && existsSync(path.join(ASSETS_DIR, old.audioPath));
  if (
    old &&
    old.textFingerprint === textFingerprint &&
    (old.status !== "COMPLETE" || fileOk)
  )
    return old;
  return {
    narrationUnitId: u.id,
    textFingerprint,
    status: "PENDING",
    attemptCount: 0,
  };
});

const plan = planItems(
  takes.map((t) => ({ id: t.narrationUnitId, ...t })),
  MAX_ATTEMPTS,
);
console.log(
  `keep ${plan.keep.length} · retry ${plan.retry.length} · run ${plan.run.length} · exhausted ${plan.exhausted.length}`,
);

for (const id of [...plan.retry, ...plan.run]) {
  const i = takes.findIndex((t) => t.narrationUnitId === id);
  const unit = ws.script.units.find((u) => u.id === id)!;
  const take = { ...takes[i], attemptCount: takes[i].attemptCount + 1 };
  try {
    if (simulateFailure === id)
      throw new Error("simulated failure (--simulate-failure)");
    const r = await provider.synthesize({
      narrationUnitId: id,
      text: unit.text,
      outputPath: `${unitsDir}/${id}.wav`,
    });
    takes[i] = {
      ...take,
      status: "COMPLETE",
      audioPath: r.audioPath,
      durationSec: r.durationSec,
      lastError: undefined,
    };
    console.log(`  ✓ ${id} ${r.durationSec.toFixed(2)}s`);
  } catch (err) {
    takes[i] = { ...take, status: "FAILED", lastError: (err as Error).message };
    console.log(
      `  ✗ ${id} attempt ${take.attemptCount}: ${(err as Error).message}`,
    );
  }
}

const allComplete = takes.every((t) => t.status === "COMPLETE");
const narrationId = prior?.id ?? `narr-${caseId.replace(/^case-/, "")}`;
let artifact: NarrationArtifact = {
  schemaVersion: SCHEMA_VERSION,
  kind: "narration",
  id: narrationId,
  scriptFingerprint: scriptFp,
  provider: {
    id: provider.info.id,
    costTier: provider.info.costTier,
    voice: flag(args, "voice"),
  },
  status: allComplete
    ? "GENERATED"
    : takes.some((t) => t.status === "FAILED")
      ? "FAILED"
      : "PENDING",
  createdAt: prior?.createdAt ?? now(),
  units: takes,
  producedFromApprovedScript: scriptGate === "APPROVED",
  isSynthetic: ws.project.isSynthetic,
  notes: draft
    ? "Draft narration (script not yet approved) — timing work only."
    : undefined,
};

if (allComplete) {
  const buffers = takes.map(
    (t) => new Uint8Array(readFileSync(path.join(ASSETS_DIR, t.audioPath!))),
  );
  const pauses = ws.script.units.map((u) => u.pauseAfterSec);
  const joined = joinWavs(buffers, pauses);
  const audioPath = `audio/${caseId}/narration.wav`;
  writeFileSync(path.join(ASSETS_DIR, audioPath), joined.bytes);
  const at = now();
  artifact = {
    ...artifact,
    status: "MEASURED",
    audioPath,
    durationSec: Math.round(joined.info.durationSec * 1000) / 1000,
    sampleRate: joined.info.sampleRate,
    channels: joined.info.channels,
    measuredAt: at,
  };
  const spans = joined.spans.map((s, i) => ({
    narrationId: ws.script!.units[i].id,
    startMs: Math.round(s.startSec * 1000),
    endMs: Math.round(s.endSec * 1000),
  }));
  const alignment = alignmentFromSpans(ws.script, spans, {
    narrationId,
    source: "PER_UNIT_SYNTHESIS",
    createdAt: at,
    audioDurationSec: artifact.durationSec,
    tool: "per-unit SAPI takes joined with exact silences; word times interpolated",
  });
  writeJson(path.join(dir, WORKSPACE_FILES.alignment), alignment);
  console.log(
    `MEASURED ${artifact.durationSec}s → ${audioPath}; alignment written (${alignment.segments.length} segments)`,
  );
}

writeJson(
  path.join(dir, WORKSPACE_FILES.narration),
  narrationArtifactSchema.parse(artifact),
);
console.log(
  `narration status: ${artifact.status}${artifact.producedFromApprovedScript ? "" : " (DRAFT — not from an approved script)"}`,
);
process.exit(allComplete ? 0 : 1);
