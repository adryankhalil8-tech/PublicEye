import { describe, expect, it } from "vitest";
import type { CaseWorkspace, RunManifest } from "../src/domain";
import {
  assertPaidOperationApproved,
  CostApprovalRequiredError,
} from "../src/pipeline/cost";
import { fingerprint } from "../src/pipeline/fingerprint";
import {
  gateState,
  GateResolutionError,
  requestGate,
  resolveGate,
} from "../src/pipeline/gates";
import {
  createRun,
  deserializeRun,
  nextStep,
  planItems,
  planResume,
  serializeRun,
  StageTransitionError,
  transitionStage,
} from "../src/pipeline/run";
import { stageDefinition, STAGE_GRAPH } from "../src/pipeline/stages";
import { PaidProviderNotAllowedError } from "../src/providers/policy";
import { validateWorkspace } from "../src/validation";
import { latestRun } from "../scripts/lib/workspace-fs";
import { SYNTHETIC_FIXTURE_DIR } from "../fixtures/cases/synthetic-tern-river-payroll";
import { fixture } from "./helpers";

const T0 = "2026-09-30T10:00:00Z";
const T1 = "2026-09-30T11:00:00Z";
const HUMAN = "human:Test Reviewer";

const newRun = () =>
  createRun("case-synthetic-tern-river-payroll", "run-test", T0);

/** Request + approve a gate the way a human would (answers every item). */
const approve = (
  run: RunManifest,
  ws: CaseWorkspace,
  type: Parameters<typeof requestGate>[1],
) => {
  const { run: r, gate } = requestGate(run, type, ws, T0);
  return resolveGate(r, gate.id, ws, {
    decision: "APPROVED",
    by: HUMAN,
    at: T1,
    answers: Object.fromEntries(
      gate.checklist.map((c) => [c.id, "YES" as const]),
    ),
  });
};

/** Walk a mechanical/creative stage to COMPLETE with its real input fingerprint. */
const complete = (
  run: RunManifest,
  ws: CaseWorkspace,
  stage: Parameters<typeof transitionStage>[1],
) => {
  let r = transitionStage(run, stage, "READY", { at: T0 });
  r = transitionStage(r, stage, "RUNNING", { at: T0 });
  return transitionStage(r, stage, "COMPLETE", {
    at: T1,
    inputsFingerprint: fingerprint(stageDefinition(stage).inputs(ws)),
  });
};

describe("fingerprint", () => {
  it("ignores key order and undefined fields, detects real changes", () => {
    expect(fingerprint({ a: 1, b: [1, 2], c: undefined })).toBe(
      fingerprint({ b: [1, 2], a: 1 }),
    );
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
    expect(fingerprint("x")).toMatch(/^fp1-[0-9a-f]{14}$/);
  });
});

describe("run manifest", () => {
  it("covers every stage of the graph, all PENDING", () => {
    const run = newRun();
    expect(run.stages.map((s) => s.stage)).toEqual(
      STAGE_GRAPH.map((d) => d.stage),
    );
    expect(run.stages.every((s) => s.status === "PENDING")).toBe(true);
  });

  it("round-trips through JSON serialization", () => {
    const ws = fixture();
    const run = complete(approve(newRun(), ws, "RESEARCH"), ws, "RESEARCH");
    const json = serializeRun(run);
    expect(json.endsWith("\n")).toBe(true);
    expect(deserializeRun(json)).toEqual(run);
  });

  it("puts narration and alignment before visual planning in the graph", () => {
    const order = STAGE_GRAPH.map((d) => d.stage);
    expect(order.indexOf("NARRATION")).toBeLessThan(
      order.indexOf("VISUAL_PLAN"),
    );
    expect(order.indexOf("ALIGNMENT")).toBeLessThan(
      order.indexOf("VISUAL_PLAN"),
    );
    expect(stageDefinition("VISUAL_PLAN").requiresArtifacts).toEqual(
      expect.arrayContaining(["alignment", "visualBible"]),
    );
    expect(stageDefinition("NARRATION").requiresGates).toContain("SCRIPT");
  });
});

describe("stage transitions", () => {
  it("allows the normal lifecycle and counts attempts", () => {
    const ws = fixture();
    const run = complete(newRun(), ws, "RESEARCH");
    const s = run.stages.find((x) => x.stage === "RESEARCH")!;
    expect(s.status).toBe("COMPLETE");
    expect(s.attemptCount).toBe(1);
    expect(s.inputsFingerprint).toBeDefined();
  });

  it("rejects illegal jumps", () => {
    expect(() =>
      transitionStage(newRun(), "RENDER", "COMPLETE", {
        at: T0,
        inputsFingerprint: "x",
      }),
    ).toThrow(StageTransitionError);
  });

  it("requires an inputs fingerprint to complete a production stage", () => {
    let r = transitionStage(newRun(), "RENDER", "READY", { at: T0 });
    r = transitionStage(r, "RENDER", "RUNNING", { at: T0 });
    expect(() => transitionStage(r, "RENDER", "COMPLETE", { at: T0 })).toThrow(
      /inputsFingerprint/,
    );
  });

  it("records failures and stops retrying at the attempt limit", () => {
    let r = newRun();
    r = transitionStage(r, "RENDER", "READY", { at: T0 });
    for (let i = 0; i < 3; i++) {
      r = transitionStage(r, "RENDER", "RUNNING", { at: T0 });
      r = transitionStage(r, "RENDER", "FAILED", {
        at: T0,
        error: `boom ${i}`,
      });
      if (i < 2) r = transitionStage(r, "RENDER", "READY", { at: T0 });
    }
    expect(r.failures).toHaveLength(3);
    expect(r.overallStatus).toBe("FAILED");
    expect(() => transitionStage(r, "RENDER", "READY", { at: T0 })).toThrow(
      /retry limit/,
    );
  });

  it("will not complete a gate stage unless the gate is approved", () => {
    const ws = fixture();
    let r = transitionStage(newRun(), "GATE_RESEARCH", "READY", { at: T0 });
    r = transitionStage(r, "GATE_RESEARCH", "RUNNING", { at: T0 });
    expect(() =>
      transitionStage(r, "GATE_RESEARCH", "COMPLETE", {
        at: T0,
        workspace: ws,
      }),
    ).toThrow(/MISSING/);
    const approved = approve(r, ws, "RESEARCH");
    expect(
      transitionStage(approved, "GATE_RESEARCH", "COMPLETE", {
        at: T1,
        workspace: ws,
      }).stages.find((s) => s.stage === "GATE_RESEARCH")!.status,
    ).toBe("COMPLETE");
  });
});

describe("selective item retry", () => {
  it("keeps completed items, retries failures, continues pending, flags exhausted", () => {
    const plan = planItems([
      { id: "asset-001", status: "COMPLETE", attemptCount: 1 },
      { id: "asset-002", status: "COMPLETE", attemptCount: 2 },
      { id: "asset-003", status: "FAILED", attemptCount: 1 },
      { id: "asset-004", status: "PENDING", attemptCount: 0 },
      { id: "asset-005", status: "FAILED", attemptCount: 3 },
    ]);
    expect(plan).toEqual({
      keep: ["asset-001", "asset-002"],
      retry: ["asset-003"],
      run: ["asset-004"],
      exhausted: ["asset-005"],
    });
  });

  it("applies to the fixture's real narration takes and assets", () => {
    const ws = fixture();
    expect(
      planItems(
        ws.narration!.units.map((u) => ({ id: u.narrationUnitId, ...u })),
      ).keep,
    ).toHaveLength(ws.script!.units.length);
    // nu-003 really failed once during fixture production, then succeeded.
    expect(
      ws.narration!.units.find((u) => u.narrationUnitId === "nu-003")!
        .attemptCount,
    ).toBe(2);
    const assetPlan = planItems(
      ws.assets!.assets.map((a) => ({
        id: a.id,
        status: a.status,
        attemptCount: a.attemptCount,
      })),
    );
    expect(assetPlan.keep).toEqual([
      "ast-paper-texture",
      "ast-office-illustration",
    ]);
    expect(assetPlan.run).toEqual(["ast-mill-photo"]);
  });
});

describe("resume planning", () => {
  const ws = fixture();
  const issues = validateWorkspace(ws);

  it("blocks storytelling until the research gate is approved", () => {
    const plans = planResume(
      complete(
        complete(complete(newRun(), ws, "RESEARCH"), ws, "VERIFICATION"),
        ws,
        "TIMELINE",
      ),
      ws,
      issues,
    );
    expect(plans.find((p) => p.stage === "GATE_RESEARCH")!.action).toBe(
      "WAIT_FOR_HUMAN",
    );
    const story = plans.find((p) => p.stage === "STORY")!;
    expect(story.action).toBe("BLOCKED");
    expect(story.reasons.join()).toMatch(/gate RESEARCH is MISSING/);
    expect(nextStep(plans)!.stage).toBe("GATE_RESEARCH");
  });

  it("keeps completed stages whose inputs are unchanged", () => {
    const run = complete(
      complete(newRun(), ws, "RESEARCH"),
      ws,
      "VERIFICATION",
    );
    const plans = planResume(run, ws, issues);
    expect(plans.slice(0, 2).map((p) => p.action)).toEqual(["KEEP", "KEEP"]);
    expect(plans.find((p) => p.stage === "TIMELINE")!.action).toBe("RUN");
  });

  it("reruns a stale stage and everything downstream of it", () => {
    let run = approve(
      complete(
        complete(complete(newRun(), ws, "RESEARCH"), ws, "VERIFICATION"),
        ws,
        "TIMELINE",
      ),
      ws,
      "RESEARCH",
    );
    run = complete(run, ws, "STORY");
    const edited = structuredClone(ws);
    edited.claims.claims[0].evidence[0].reference.page = "2"; // verification input changes
    const plans = planResume(run, edited, validateWorkspace(edited));
    const action = (s: string) => plans.find((p) => p.stage === s)!.action;
    expect(action("RESEARCH")).toBe("KEEP");
    expect(action("VERIFICATION")).toBe("RERUN");
    expect(action("TIMELINE")).toBe("RERUN");
    // Research gate approval is now stale: the reviewed claims changed.
    expect(action("GATE_RESEARCH")).toBe("WAIT_FOR_HUMAN");
  });

  it("refuses to plan visual timing on estimated alignment", () => {
    const est = structuredClone(ws);
    est.alignment!.alignmentSource = "ESTIMATED";
    const plans = planResume(newRun(), est, validateWorkspace(est));
    expect(
      plans.find((p) => p.stage === "VISUAL_PLAN")!.reasons.join(),
    ).toMatch(/ESTIMATED/);
  });

  it("does not render while manifest assets are incomplete", () => {
    const broken = structuredClone(ws);
    broken.assets!.assets.find(
      (a) => a.id === "ast-office-illustration",
    )!.status = "FAILED";
    const plans = planResume(newRun(), broken, validateWorkspace(broken));
    expect(plans.find((p) => p.stage === "RENDER")!.reasons.join()).toMatch(
      /ast-office-illustration/,
    );
  });

  it("does not run technical QA before a render exists", () => {
    const plans = planResume(newRun(), ws, issues, {
      existingOutputs: new Set(),
    });
    expect(
      plans.find((p) => p.stage === "TECHNICAL_QA")!.reasons.join(),
    ).toMatch(/master\.mp4/);
  });
});

describe("approval gates", () => {
  const ws = fixture();

  it("starts PENDING with the gate's checklist", () => {
    const { gate } = requestGate(newRun(), "PUBLICATION", ws, T0);
    expect(gate.status).toBe("PENDING");
    expect(gate.checklist.map((c) => c.id)).toContain("final-approved");
  });

  it("refuses non-human approvers", () => {
    const { run, gate } = requestGate(newRun(), "SCRIPT", ws, T0);
    for (const by of ["skill:crime-script-writer", "agent", "", "human:"]) {
      expect(() =>
        resolveGate(run, gate.id, ws, { decision: "APPROVED", by, at: T1 }),
      ).toThrow(GateResolutionError);
    }
  });

  it("refuses approval with unanswered or NO checklist items, or blocking issues", () => {
    const { run, gate } = requestGate(newRun(), "SCRIPT", ws, T0);
    expect(() =>
      resolveGate(run, gate.id, ws, {
        decision: "APPROVED",
        by: HUMAN,
        at: T1,
      }),
    ).toThrow(/not answered/);
    const answers = Object.fromEntries(
      gate.checklist.map((c) => [c.id, "YES" as const]),
    );
    expect(() =>
      resolveGate(run, gate.id, ws, {
        decision: "APPROVED",
        by: HUMAN,
        at: T1,
        answers: { ...answers, "no-invention": "NO" },
      }),
    ).toThrow(/not answered YES/);
    expect(() =>
      resolveGate(run, gate.id, ws, {
        decision: "APPROVED",
        by: HUMAN,
        at: T1,
        answers,
        blockingIssues: ["quote unverified"],
      }),
    ).toThrow(/blocking/);
  });

  it("allows rejection and change requests without full answers", () => {
    const { run, gate } = requestGate(newRun(), "SCRIPT", ws, T0);
    const r = resolveGate(run, gate.id, ws, {
      decision: "CHANGES_REQUESTED",
      by: HUMAN,
      at: T1,
      blockingIssues: ["tighten act two"],
    });
    expect(gateState(r, "SCRIPT", ws)).toBe("CHANGES_REQUESTED");
  });

  it("goes STALE when reviewed content changes after approval", () => {
    const run = approve(newRun(), ws, "SCRIPT");
    expect(gateState(run, "SCRIPT", ws)).toBe("APPROVED");
    const edited = structuredClone(ws);
    edited.script!.units[0].text += " Edited.";
    expect(gateState(run, "SCRIPT", edited)).toBe("STALE");
  });

  it("cannot approve if content changed between request and decision", () => {
    const { run, gate } = requestGate(newRun(), "SCRIPT", ws, T0);
    const edited = structuredClone(ws);
    edited.script!.units[0].text += " Edited.";
    const answers = Object.fromEntries(
      gate.checklist.map((c) => [c.id, "YES" as const]),
    );
    expect(() =>
      resolveGate(run, gate.id, edited, {
        decision: "APPROVED",
        by: HUMAN,
        at: T1,
        answers,
      }),
    ).toThrow(/changed since/);
  });

  it("the fixture's real run has gates requested but none approved by the agent", () => {
    const run = latestRun(SYNTHETIC_FIXTURE_DIR)!;
    expect(run.gates.map((g) => g.type)).toEqual(
      expect.arrayContaining(["RESEARCH", "SCRIPT"]),
    );
    expect(
      run.gates.every((g) => g.status === "PENDING" && !g.resolvedBy),
    ).toBe(true);
    expect(gateState(run, "SCRIPT", ws)).toBe("PENDING");
    // …which is why the fixture's narration is honestly marked as draft.
    expect(ws.narration!.producedFromApprovedScript).toBe(false);
  });
});

describe("cost gate", () => {
  const paid = {
    id: "elevenlabs",
    displayName: "ElevenLabs",
    costTier: "PAID" as const,
    requiresNetwork: true,
    requiresApiKey: true,
  };
  const local = { ...paid, id: "piper", costTier: "LOCAL" as const };

  it("lets free/local operations through with no approval", () => {
    expect(
      assertPaidOperationApproved(newRun(), local, ["nu-001"], 0),
    ).toBeNull();
  });

  it("refuses paid operations without the env opt-in", () => {
    expect(() =>
      assertPaidOperationApproved(newRun(), paid, ["nu-001"], 0.2),
    ).toThrow(PaidProviderNotAllowedError);
  });

  it("refuses paid operations without a human-approved cost approval covering the jobs", () => {
    const run = newRun();
    expect(() =>
      assertPaidOperationApproved(run, paid, ["nu-001"], 0.2, {
        allowPaid: true,
      }),
    ).toThrow(CostApprovalRequiredError);
    const withApproval: RunManifest = {
      ...run,
      costApprovals: [
        {
          id: "cost-1",
          providerId: "elevenlabs",
          jobs: ["nu-001"],
          estimatedUsd: 0.25,
          status: "APPROVED",
          requestedAt: T0,
          resolvedAt: T1,
          resolvedBy: HUMAN,
        },
      ],
    };
    expect(
      assertPaidOperationApproved(withApproval, paid, ["nu-001"], 0.2, {
        allowPaid: true,
      })?.id,
    ).toBe("cost-1");
    expect(() =>
      assertPaidOperationApproved(
        withApproval,
        paid,
        ["nu-001", "nu-002"],
        0.2,
        { allowPaid: true },
      ),
    ).toThrow(CostApprovalRequiredError);
    expect(() =>
      assertPaidOperationApproved(withApproval, paid, ["nu-001"], 1.0, {
        allowPaid: true,
      }),
    ).toThrow(CostApprovalRequiredError);
  });
});
