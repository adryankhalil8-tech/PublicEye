import type { CaseWorkspace, GateType, PipelineStage } from "../domain";
import { OUTPUT_FILES } from "../domain";

/** Workspace keys an artifact requirement can name. */
export type ArtifactKey = Exclude<keyof CaseWorkspace, "project">;

export type StageKind = "CREATIVE" | "MECHANICAL" | "HUMAN_GATE";

export type StageDefinition = {
  stage: PipelineStage;
  kind: StageKind;
  /** Project skill that performs the stage (CREATIVE/MECHANICAL). */
  skill?: string;
  /** For HUMAN_GATE stages. */
  gate?: GateType;
  /** Artifacts that must exist (and validate) before the stage may run. */
  requiresArtifacts: ArtifactKey[];
  /** Gates that must be APPROVED and fresh before the stage may run. */
  requiresGates: GateType[];
  /** What the stage produces (workspace keys or output paths). */
  produces: (ArtifactKey | string)[];
  /** The inputs whose change makes this stage's output stale. */
  inputs: (ws: CaseWorkspace) => unknown;
  description: string;
};

/**
 * The production dependency graph, in execution order. Narration and
 * alignment precede visual planning: shots are timed to measured audio.
 */
export const STAGE_GRAPH: StageDefinition[] = [
  {
    stage: "RESEARCH",
    kind: "CREATIVE",
    skill: "case-research",
    requiresArtifacts: [],
    requiresGates: [],
    produces: ["sources", "claims", "entities", "research"],
    // Identity only: housekeeping fields (status, updatedAt) must not stale research.
    inputs: (ws) => {
      const { id, caseName, caseType, jurisdiction, isSynthetic } = ws.project;
      return { id, caseName, caseType, jurisdiction, isSynthetic };
    },
    description: "Sources, claim ledger (UNVERIFIED), entities, research brief",
  },
  {
    stage: "VERIFICATION",
    kind: "CREATIVE",
    skill: "source-verification",
    requiresArtifacts: ["sources", "claims", "entities"],
    requiresGates: [],
    produces: ["claims", "entities"],
    inputs: (ws) => ({
      sources: ws.sources,
      evidence: ws.claims.claims.map((c) => [c.id, c.evidence, c.assertion]),
    }),
    description: "Claim statuses set by evidence policy; legal-status history",
  },
  {
    stage: "TIMELINE",
    kind: "CREATIVE",
    skill: "case-timeline",
    requiresArtifacts: ["claims"],
    requiresGates: [],
    produces: ["timeline"],
    inputs: (ws) => ws.claims,
    description: "Chronology with honest date precision and gaps",
  },
  {
    stage: "GATE_RESEARCH",
    kind: "HUMAN_GATE",
    gate: "RESEARCH",
    requiresArtifacts: [
      "sources",
      "claims",
      "entities",
      "timeline",
      "research",
    ],
    requiresGates: [],
    produces: [],
    inputs: () => null,
    description:
      "Gate 1: claims supported, allegations and legal outcomes correct",
  },
  {
    stage: "STORY",
    kind: "CREATIVE",
    skill: "crime-story-director",
    requiresArtifacts: ["claims", "timeline", "research"],
    requiresGates: ["RESEARCH"],
    produces: ["story"],
    inputs: (ws) => ({
      claims: ws.claims,
      timeline: ws.timeline,
      research: ws.research,
    }),
    description: "Angle, hook, sequences, reveals, pacing",
  },
  {
    stage: "SCRIPT",
    kind: "CREATIVE",
    skill: "crime-script-writer",
    requiresArtifacts: ["story", "claims"],
    requiresGates: ["RESEARCH"],
    produces: ["script"],
    inputs: (ws) => ({ story: ws.story, claims: ws.claims }),
    description: "Claim-linked narration units with explicit framing",
  },
  {
    stage: "GATE_SCRIPT",
    kind: "HUMAN_GATE",
    gate: "SCRIPT",
    requiresArtifacts: ["script", "story"],
    requiresGates: ["RESEARCH"],
    produces: [],
    inputs: () => null,
    description: "Gate 2a: script approved before any narration is produced",
  },
  {
    stage: "NARRATION",
    kind: "MECHANICAL",
    skill: "narration",
    requiresArtifacts: ["script"],
    requiresGates: ["SCRIPT"],
    produces: ["narration"],
    inputs: (ws) => ws.script,
    description:
      "Per-unit audio from a local/free provider, measured from the files",
  },
  {
    stage: "ALIGNMENT",
    kind: "MECHANICAL",
    skill: "narration",
    requiresArtifacts: ["script", "narration"],
    requiresGates: ["SCRIPT"],
    produces: ["alignment"],
    inputs: (ws) => ({ script: ws.script, narration: ws.narration }),
    description: "Narration segments on the measured audio timeline",
  },
  {
    stage: "VISUAL_BIBLE",
    kind: "CREATIVE",
    skill: "visual-director",
    requiresArtifacts: ["story"],
    requiresGates: ["RESEARCH"],
    produces: ["visualBible"],
    inputs: (ws) => ({ project: ws.project, story: ws.story }),
    description: "Locked visual anchors for the case",
  },
  {
    stage: "VISUAL_PLAN",
    kind: "CREATIVE",
    skill: "visual-director",
    requiresArtifacts: ["script", "narration", "alignment", "visualBible"],
    requiresGates: ["SCRIPT"],
    produces: ["visualPlan", "manifest"],
    inputs: (ws) => ({
      script: ws.script,
      alignment: ws.alignment,
      visualBible: ws.visualBible,
    }),
    description: "Shots and visual states timed to measured narration",
  },
  {
    stage: "GATE_PRE_PRODUCTION",
    kind: "HUMAN_GATE",
    gate: "PRE_PRODUCTION",
    requiresArtifacts: [
      "script",
      "narration",
      "alignment",
      "visualBible",
      "visualPlan",
      "assets",
    ],
    requiresGates: ["SCRIPT"],
    produces: [],
    inputs: () => null,
    description:
      "Gate 2b: narration, timing, visual identity, shot plan, rights",
  },
  {
    stage: "ASSETS",
    kind: "MECHANICAL",
    skill: "asset-research",
    requiresArtifacts: ["visualPlan", "assets"],
    requiresGates: ["PRE_PRODUCTION"],
    produces: ["assets"],
    inputs: (ws) => ws.visualPlan?.assetRequirements,
    description:
      "Acquire/create assets with provenance; selective retry per asset",
  },
  {
    stage: "RENDER",
    kind: "MECHANICAL",
    skill: "remotion-video",
    requiresArtifacts: [
      "manifest",
      "assets",
      "alignment",
      "narration",
      "visualBible",
    ],
    requiresGates: ["PRE_PRODUCTION"],
    produces: [OUTPUT_FILES.master],
    inputs: (ws) => ({ manifest: ws.manifest, assets: ws.assets }),
    description: "Remotion renders the master (no burned captions)",
  },
  {
    stage: "TECHNICAL_QA",
    kind: "MECHANICAL",
    skill: "video-qc",
    requiresArtifacts: ["manifest"],
    requiresGates: ["PRE_PRODUCTION"],
    produces: ["qaReport"],
    inputs: (ws) => ws.manifest,
    description: "Duration, resolution, fps, codec, audio, file checks",
  },
  {
    stage: "EDITORIAL_QA",
    kind: "CREATIVE",
    skill: "video-qc",
    requiresArtifacts: ["manifest", "script", "claims", "qaReport"],
    requiresGates: ["PRE_PRODUCTION"],
    produces: ["qaReport"],
    inputs: (ws) => ({
      manifest: ws.manifest,
      script: ws.script,
      claims: ws.claims,
    }),
    description:
      "Fact/editorial and visual QC; human review of MANUAL_REQUIRED checks",
  },
  {
    stage: "CAPTIONS",
    kind: "MECHANICAL",
    skill: "remotion-video",
    requiresArtifacts: ["alignment"],
    requiresGates: ["PRE_PRODUCTION"],
    produces: [OUTPUT_FILES.srt, OUTPUT_FILES.ass],
    inputs: (ws) => ws.alignment,
    description: "Editable captions (SRT/ASS); optional captioned derivative",
  },
  {
    stage: "PACKAGE",
    kind: "CREATIVE",
    skill: "youtube-package",
    requiresArtifacts: ["story", "manifest", "alignment", "qaReport"],
    requiresGates: ["PRE_PRODUCTION"],
    produces: ["youtubePackage"],
    inputs: (ws) => ({
      story: ws.story,
      alignment: ws.alignment,
      claims: ws.claims,
    }),
    description: "Titles, description, chapters, thumbnail brief, credits",
  },
  {
    stage: "GATE_PUBLICATION",
    kind: "HUMAN_GATE",
    gate: "PUBLICATION",
    requiresArtifacts: ["manifest", "qaReport", "youtubePackage"],
    requiresGates: ["PRE_PRODUCTION"],
    produces: [],
    inputs: () => null,
    description:
      "Gate 3: QA passed, captions/credits correct, final video approved",
  },
];

export const stageDefinition = (stage: PipelineStage): StageDefinition => {
  const def = STAGE_GRAPH.find((d) => d.stage === stage);
  if (!def) throw new Error(`unknown stage ${stage}`);
  return def;
};
