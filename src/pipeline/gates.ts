import type {
  ApprovalGate,
  CaseWorkspace,
  GateChecklistItem,
  GateType,
  RunManifest,
} from "../domain";
import { approvalGateSchema } from "../domain";
import { fingerprint } from "./fingerprint";

/** What each gate reviews. Changing any of it after approval → STALE. */
export const gateSubject = (type: GateType, ws: CaseWorkspace): unknown => {
  switch (type) {
    case "RESEARCH":
      return {
        sources: ws.sources,
        claims: ws.claims,
        entities: ws.entities,
        timeline: ws.timeline,
        research: ws.research,
      };
    case "SCRIPT":
      return { story: ws.story, script: ws.script };
    case "PRE_PRODUCTION":
      return {
        script: ws.script,
        narration: ws.narration,
        alignment: ws.alignment,
        visualBible: ws.visualBible,
        visualPlan: ws.visualPlan,
        rights: ws.assets?.assets.map((a) => [
          a.id,
          a.rightsStatus,
          a.approval.status,
        ]),
      };
    case "PUBLICATION":
      return {
        manifest: ws.manifest,
        qaReport: ws.qaReport,
        youtubePackage: ws.youtubePackage,
        captions: ws.alignment?.words,
      };
  }
};

export const GATE_CHECKLISTS: Record<
  GateType,
  { id: string; question: string }[]
> = {
  RESEARCH: [
    {
      id: "core-claims-supported",
      question:
        "Are all CORE claims SUPPORTED by the evidence as read in the source?",
    },
    {
      id: "allegations-attributed",
      question:
        "Are allegations recorded as ATTRIBUTED claims, never as facts?",
    },
    {
      id: "legal-outcomes-correct",
      question:
        "Is every named person's legal status (charged, convicted, acquitted…) correct and current?",
    },
    {
      id: "contradictions-documented",
      question:
        "Are contradictions between sources documented, not silently resolved?",
    },
    {
      id: "timeline-gaps-understood",
      question: "Are the major timeline gaps and uncertain dates understood?",
    },
    {
      id: "sensitivity-reviewed",
      question:
        "Have minors, living private individuals, and victims' families been considered?",
    },
  ],
  SCRIPT: [
    {
      id: "script-accurate",
      question: "Does every factual sentence match its cited claims?",
    },
    {
      id: "framing-fair",
      question: "Is uncertainty audible and is framing fair to everyone named?",
    },
    {
      id: "no-invention",
      question:
        "Is the script free of invented dialogue, thoughts, motives, and events?",
    },
    {
      id: "ready-to-voice",
      question: "Is the script final enough to produce narration?",
    },
  ],
  PRE_PRODUCTION: [
    {
      id: "narration-approved",
      question:
        "Is the narration audio approved (pronunciation, pacing, tone)?",
    },
    {
      id: "timing-correct",
      question: "Is narration timing measured from real audio and correct?",
    },
    {
      id: "visual-identity",
      question: "Is the visual bible (identity) approved?",
    },
    {
      id: "shot-plan",
      question: "Is the shot / visual-state plan acceptable?",
    },
    {
      id: "reconstructions-labeled",
      question: "Are all reconstructions/illustrations labeled?",
    },
    {
      id: "asset-rights",
      question: "Are asset rights acceptable for every planned asset?",
    },
    {
      id: "cost-approved",
      question:
        "Is estimated spend $0, or has any paid operation been explicitly approved?",
    },
  ],
  PUBLICATION: [
    { id: "technical-qa", question: "Did technical QA pass?" },
    {
      id: "editorial-qa",
      question: "Did factual/editorial QC pass, including human review?",
    },
    { id: "visual-qa", question: "Did visual QC pass?" },
    {
      id: "captions-correct",
      question: "Are the captions correct and in sync?",
    },
    {
      id: "credits-sources",
      question: "Are credits and source/attribution requirements satisfied?",
    },
    {
      id: "metadata-accurate",
      question:
        "Are title, description, and thumbnail accurate (no claim stronger than the video)?",
    },
    {
      id: "final-approved",
      question: "Is the final video approved for publication?",
    },
  ],
};

export type GateState =
  | "MISSING"
  | "PENDING"
  | "APPROVED"
  | "STALE"
  | "REJECTED"
  | "CHANGES_REQUESTED";

/** Latest gate of a type in the run (gates are append-only history). */
export const latestGate = (
  run: RunManifest,
  type: GateType,
): ApprovalGate | undefined =>
  [...run.gates].reverse().find((g) => g.type === type);

export const gateState = (
  run: RunManifest,
  type: GateType,
  ws: CaseWorkspace,
): GateState => {
  const gate = latestGate(run, type);
  if (!gate) return "MISSING";
  if (gate.status === "APPROVED") {
    return gate.subjectFingerprint === fingerprint(gateSubject(type, ws))
      ? "APPROVED"
      : "STALE";
  }
  return gate.status;
};

/** Open a new PENDING gate for the current state of the reviewed artifacts. */
export const requestGate = (
  run: RunManifest,
  type: GateType,
  ws: CaseWorkspace,
  at: string,
): { run: RunManifest; gate: ApprovalGate } => {
  const n = run.gates.filter((g) => g.type === type).length + 1;
  const gate = approvalGateSchema.parse({
    id: `gate-${type.toLowerCase().replace(/_/g, "-")}-${n}`,
    runId: run.runId,
    type,
    status: "PENDING",
    requestedAt: at,
    subjectFingerprint: fingerprint(gateSubject(type, ws)),
    checklist: GATE_CHECKLISTS[type].map((c) => ({ ...c })),
    blockingIssues: [],
  });
  return { run: { ...run, updatedAt: at, gates: [...run.gates, gate] }, gate };
};

export class GateResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GateResolutionError";
  }
}

export type GateDecision = {
  decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  /** Must be "human:<name>". */
  by: string;
  at: string;
  answers?: Record<string, GateChecklistItem["answer"]>;
  blockingIssues?: string[];
  notes?: string;
};

/**
 * Resolve a PENDING gate. Enforces that approval is explicit and human:
 * a named human, every checklist item answered YES/NA, no blocking issues,
 * and the reviewed artifacts unchanged since the gate was requested.
 */
export const resolveGate = (
  run: RunManifest,
  gateId: string,
  ws: CaseWorkspace,
  d: GateDecision,
): RunManifest => {
  const gate = run.gates.find((g) => g.id === gateId);
  if (!gate) throw new GateResolutionError(`no gate ${gateId}`);
  if (gate.status !== "PENDING")
    throw new GateResolutionError(`gate ${gateId} is already ${gate.status}`);
  if (!/^human:\S/.test(d.by)) {
    throw new GateResolutionError(
      `gates are resolved by humans only ("human:<name>"), got "${d.by}"`,
    );
  }
  const checklist = gate.checklist.map((c) => ({
    ...c,
    answer: d.answers?.[c.id] ?? c.answer,
  }));
  const blockingIssues = [...gate.blockingIssues, ...(d.blockingIssues ?? [])];

  if (d.decision === "APPROVED") {
    const unanswered = checklist.filter(
      (c) => c.answer !== "YES" && c.answer !== "NA",
    );
    if (unanswered.length) {
      throw new GateResolutionError(
        `cannot approve: not answered YES/NA: ${unanswered.map((c) => c.id).join(", ")}`,
      );
    }
    if (blockingIssues.length)
      throw new GateResolutionError(
        `cannot approve with blocking issues: ${blockingIssues.join("; ")}`,
      );
    if (gate.subjectFingerprint !== fingerprint(gateSubject(gate.type, ws))) {
      throw new GateResolutionError(
        "reviewed artifacts changed since the gate was requested — request a new gate",
      );
    }
  }

  const resolved: ApprovalGate = {
    ...gate,
    status: d.decision,
    resolvedAt: d.at,
    resolvedBy: d.by,
    checklist,
    blockingIssues,
    notes: d.notes ?? gate.notes,
  };
  return {
    ...run,
    updatedAt: d.at,
    gates: run.gates.map((g) => (g.id === gateId ? resolved : g)),
  };
};
