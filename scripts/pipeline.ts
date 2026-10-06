/**
 * Resumable run state for a case.
 *
 *   npm run pipeline -- init   <case>              create runs/run-<timestamp>.json
 *   npm run pipeline -- status <case>              show what a resume would do
 *   npm run pipeline -- mark   <case> <STAGE> <STATUS> [--error="…"]
 *
 * `status` is read-only: for every stage it says KEEP (done, inputs
 * unchanged), RERUN (stale), RETRY (failed, attempts left), RUN (ready),
 * WAIT_FOR_HUMAN (gate), or BLOCKED (with reasons). It also lists per-item
 * plans for narration takes and assets, so a resume never regenerates
 * completed work.
 */
import {
  pipelineStageSchema,
  stageStatusSchema,
  type RunManifest,
} from "../src/domain";
import { fingerprint } from "../src/pipeline/fingerprint";
import { gateState } from "../src/pipeline/gates";
import {
  assessArtifacts,
  createRun,
  nextStep,
  planItems,
  planResume,
  transitionStage,
} from "../src/pipeline/run";
import { stageDefinition } from "../src/pipeline/stages";
import {
  existingOutputs,
  flag,
  latestRun,
  loadWorkspace,
  resolveCaseDir,
  writeRun,
} from "./lib/workspace-fs";

const [cmd, target, ...rest] = process.argv.slice(2);
if (!cmd || !target) {
  console.error("usage: npm run pipeline -- <init|status|mark> <case> …");
  process.exit(2);
}
const dir = resolveCaseDir(target);
const report = loadWorkspace(dir);
if (!report.workspace) {
  console.error("Workspace failed to parse; run validate:case first.");
  process.exit(1);
}
const ws = report.workspace;
const at = new Date().toISOString();

const requireRun = (): RunManifest => {
  const run = latestRun(dir);
  if (!run) {
    console.error("No run yet. Create one: npm run pipeline -- init <case>");
    process.exit(1);
  }
  return run;
};

if (cmd === "init") {
  const runId = `run-${at.slice(0, 19).replace(/[-:T]/g, "").toLowerCase()}`;
  const file = writeRun(dir, createRun(ws.project.id, runId, at));
  console.log(`Created ${file}`);
} else if (cmd === "status") {
  const run = requireRun();
  const plans = planResume(run, ws, report.issues, {
    existingOutputs: existingOutputs(dir),
  });
  console.log(`\n${run.runId} · ${ws.project.title}\n`);
  for (const p of plans) {
    const stage = run.stages.find((s) => s.stage === p.stage)!;
    const def = stageDefinition(p.stage);
    const who =
      def.kind === "HUMAN_GATE"
        ? `gate:${def.gate} (${gateState(run, def.gate!, ws)})`
        : (def.skill ?? "");
    console.log(
      `${p.action.padEnd(15)} ${p.stage.padEnd(20)} ${stage.status.padEnd(12)} ${who}`,
    );
    for (const r of p.reasons) console.log(`${" ".repeat(16)}· ${r}`);
  }
  const takes = ws.narration?.units ?? [];
  if (takes.length) {
    const ip = planItems(takes.map((t) => ({ id: t.narrationUnitId, ...t })));
    console.log(
      `\nnarration takes: keep ${ip.keep.length}, retry [${ip.retry.join(", ")}], run [${ip.run.join(", ")}], exhausted [${ip.exhausted.join(", ")}]`,
    );
  }
  const assets = ws.assets?.assets ?? [];
  if (assets.length) {
    const ip = planItems(
      assets.map((a) => ({
        id: a.id,
        status: a.status,
        attemptCount: a.attemptCount,
      })),
    );
    console.log(
      `assets: keep [${ip.keep.join(", ")}], retry [${ip.retry.join(", ")}], run [${ip.run.join(", ")}], exhausted [${ip.exhausted.join(", ")}]`,
    );
  }
  const artifacts = assessArtifacts(run, ws, existingOutputs(dir));
  if (artifacts.length) {
    console.log("\nartifacts:");
    for (const a of artifacts)
      console.log(`  ${a.validity.padEnd(8)} ${a.path}`);
  }
  const next = nextStep(plans);
  console.log(
    `\nNEXT: ${next ? `${next.action} ${next.stage}` : "nothing — all stages current"}`,
  );
} else if (cmd === "mark") {
  const [stageArg, statusArg] = rest.filter((a) => !a.startsWith("--"));
  const stage = pipelineStageSchema.parse(stageArg);
  const status = stageStatusSchema.parse(statusArg);
  const def = stageDefinition(stage);
  const updated = transitionStage(requireRun(), stage, status, {
    at,
    error: flag(rest, "error"),
    inputsFingerprint:
      status === "COMPLETE" && def.kind !== "HUMAN_GATE"
        ? fingerprint(def.inputs(ws))
        : undefined,
    workspace: ws,
  });
  writeRun(dir, updated);
  console.log(`${stage} → ${status}`);
} else {
  console.error(`unknown command ${cmd}`);
  process.exit(2);
}
