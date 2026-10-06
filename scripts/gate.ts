/**
 * Human approval gates. This is a HUMAN tool: agents may request a gate and
 * show its checklist, but must never approve, reject, or answer on a
 * person's behalf.
 *
 *   npm run gate -- request <case> <RESEARCH|SCRIPT|PRE_PRODUCTION|PUBLICATION>
 *   npm run gate -- show    <case> <gate-id>
 *   npm run gate -- approve <case> <gate-id> --by="human:Your Name"
 *                           (--answer=<item-id>=YES|NO|NA … | --all-yes) [--notes="…"]
 *   npm run gate -- reject  <case> <gate-id> --by="human:…" --issue="…" [--issue="…"]
 *   npm run gate -- changes <case> <gate-id> --by="human:…" --issue="…"
 *
 * Approval is refused unless every checklist item is answered YES/NA, there
 * are no blocking issues, and the reviewed artifacts are unchanged since the
 * gate was requested.
 */
import { gateTypeSchema, type GateChecklistItem } from "../src/domain";
import {
  GATE_CHECKLISTS,
  requestGate,
  resolveGate,
} from "../src/pipeline/gates";
import {
  flag,
  latestRun,
  loadWorkspace,
  resolveCaseDir,
  writeRun,
} from "./lib/workspace-fs";

const [cmd, target, arg, ...rest] = process.argv.slice(2);
if (!cmd || !target || !arg) {
  console.error(
    "usage: npm run gate -- <request|show|approve|reject|changes> <case> <TYPE|gate-id> …",
  );
  process.exit(2);
}
const dir = resolveCaseDir(target);
const ws = loadWorkspace(dir).workspace;
const run = latestRun(dir);
if (!ws || !run) {
  console.error(
    "Need a valid workspace and a run (npm run pipeline -- init <case>).",
  );
  process.exit(1);
}
const at = new Date().toISOString();
const all = (name: string) =>
  rest
    .filter((a) => a.startsWith(`--${name}=`))
    .map((a) => a.slice(name.length + 3));

try {
  if (cmd === "request") {
    const type = gateTypeSchema.parse(arg);
    const { run: updated, gate } = requestGate(run, type, ws, at);
    writeRun(dir, updated);
    console.log(`Requested ${gate.id}. A human reviews:`);
    for (const c of GATE_CHECKLISTS[type])
      console.log(`  [${c.id}] ${c.question}`);
  } else if (cmd === "show") {
    const gate = run.gates.find((g) => g.id === arg);
    if (!gate) throw new Error(`no gate ${arg}`);
    console.log(
      `${gate.id} ${gate.type} ${gate.status}${gate.resolvedBy ? ` by ${gate.resolvedBy}` : ""}`,
    );
    for (const c of gate.checklist)
      console.log(`  ${(c.answer ?? "—").padEnd(4)} [${c.id}] ${c.question}`);
    for (const i of gate.blockingIssues) console.log(`  BLOCKING: ${i}`);
  } else if (cmd === "approve" || cmd === "reject" || cmd === "changes") {
    const by = flag(rest, "by") ?? "";
    const gate = run.gates.find((g) => g.id === arg);
    if (!gate) throw new Error(`no gate ${arg}`);
    const answers: Record<string, GateChecklistItem["answer"]> = {};
    if (flag(rest, "all-yes") === "true")
      gate.checklist.forEach((c) => (answers[c.id] = "YES"));
    for (const a of all("answer")) {
      const [id, value] = a.split("=");
      if (!["YES", "NO", "NA"].includes(value))
        throw new Error(`answer must be YES/NO/NA: ${a}`);
      answers[id] = value as GateChecklistItem["answer"];
    }
    const decision =
      cmd === "approve"
        ? "APPROVED"
        : cmd === "reject"
          ? "REJECTED"
          : "CHANGES_REQUESTED";
    const updated = resolveGate(run, arg, ws, {
      decision,
      by,
      at,
      answers,
      blockingIssues: all("issue"),
      notes: flag(rest, "notes"),
    });
    writeRun(dir, updated);
    console.log(`${arg} → ${decision} by ${by}`);
  } else {
    throw new Error(`unknown command ${cmd}`);
  }
} catch (err) {
  console.error(`REFUSED: ${(err as Error).message}`);
  process.exit(1);
}
