import { Audio } from "@remotion/media";
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  type CalculateMetadataFunction,
} from "remotion";
import type { CaseWorkspace, RawWorkspace } from "../../domain";
import { buildEstimatedAlignment } from "../../providers/alignment";
import { parseWorkspace } from "../../validation/parse";
import { buildSceneSpecs, type SceneSpec } from "../adapters/scene-spec";
import {
  CaptionLayer,
  DateCard,
  DocumentaryFrame,
  DocumentViewer,
  EvidenceBoard,
  LowerThird,
  MapPlaceholder,
  PhotoFrame,
  QuoteCard,
  RepresentationLabel,
  SectionTitle,
  SourceCitation,
  Timeline,
} from "../primitives";
import { clamp, theme, visualBibleVariables } from "../theme";

/**
 * Remotion's role: EXECUTE the plan. It receives the production manifest
 * (timed shots + visual states), narration alignment, visual bible, and
 * resolved assets, and draws them. It never decides what the story is,
 * whether a claim is true, or which evidence to trust.
 *
 * - showCaptions: false for the canonical master (captions ship as SRT/ASS);
 *   true only for the captioned derivative.
 * - withNarration: play the measured narration track from the manifest.
 *   Off by default because narration audio is a local, git-ignored file.
 */
export type CaseVideoProps = {
  workspace: RawWorkspace;
  showCaptions: boolean;
  withNarration?: boolean;
};

type Ready = {
  ws: CaseWorkspace &
    Required<Pick<CaseWorkspace, "manifest" | "script" | "visualPlan">>;
};

const load = (raw: RawWorkspace): Ready => {
  const parsed = parseWorkspace(raw);
  if (!parsed.ok) {
    throw new Error(
      `Workspace failed to parse:\n${parsed.issues.map((i) => `${i.code} ${i.path}: ${i.message}`).join("\n")}`,
    );
  }
  const ws = parsed.workspace;
  if (!ws.manifest || !ws.script || !ws.visualPlan) {
    throw new Error(
      "CaseVideo needs manifest.json, script.json and visual-plan.json. Run: npm run build:manifest -- <case>",
    );
  }
  return { ws: ws as Ready["ws"] };
};

/** Duration and size come from the manifest, never hard-coded. */
export const calculateCaseVideoMetadata: CalculateMetadataFunction<
  CaseVideoProps
> = ({ props }) => {
  const { ws } = load(props.workspace);
  const { width, height, fps, durationInFrames } = ws.manifest.render;
  return { width, height, fps, durationInFrames };
};

export const CaseVideo: React.FC<CaseVideoProps> = ({
  workspace,
  showCaptions,
  withNarration = false,
}) => {
  const { ws, scenes, captions } = useMemo(() => {
    const { ws: loaded } = load(workspace);
    const alignment =
      loaded.alignment ??
      buildEstimatedAlignment(loaded.script, loaded.manifest.generatedAt);
    return {
      ws: loaded,
      scenes: buildSceneSpecs(loaded, loaded.manifest),
      captions: alignment.words,
    };
  }, [workspace]);
  const narration = ws.manifest.narration;

  return (
    <DocumentaryFrame
      synthetic={ws.project.isSynthetic}
      themeVariables={visualBibleVariables(ws.visualBible)}
    >
      {withNarration && narration ? (
        <Audio src={staticFile(narration.audioPath)} />
      ) : null}
      {scenes.map((scene) => (
        <Sequence
          key={scene.shotId}
          name={scene.shotId}
          from={scene.startFrame}
          durationInFrames={scene.durationInFrames}
        >
          <Scene scene={scene} />
        </Sequence>
      ))}
      {showCaptions ? <CaptionLayer captions={captions} /> : null}
    </DocumentaryFrame>
  );
};

const Scene: React.FC<{ scene: SceneSpec }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const opacity =
    scene.fadeInFrames > 0
      ? interpolate(frame, [0, scene.fadeInFrames], [0, 1], clamp)
      : 1;
  return (
    <AbsoluteFill style={{ opacity }}>
      <SceneBody scene={scene} />
      <SourceCitation sources={scene.citations} />
      {scene.representationLabel ? (
        <RepresentationLabel kind={scene.representationLabel} />
      ) : null}
    </AbsoluteFill>
  );
};

const SceneBody: React.FC<{ scene: SceneSpec }> = ({ scene }) => {
  const b = scene.body;
  switch (b.kind) {
    case "document":
      return (
        <DocumentViewer
          heading={b.heading}
          subheading={b.subheading}
          lines={b.lines}
          highlightAtFrame={b.highlightAtFrame}
          dimAtFrame={b.dimAtFrame}
          textureSrc={b.texturePath ? staticFile(b.texturePath) : undefined}
        />
      );
    case "date":
      return <DateCard date={b.date} caption={b.caption} />;
    case "photo":
      return (
        <PhotoFrame
          src={staticFile(b.assetPath)}
          credit={b.credit}
          movement={b.movement}
        />
      );
    case "evidence":
      return (
        <>
          {b.name ? <LowerThird name={b.name} /> : null}
          <EvidenceBoard cards={b.cards} />
        </>
      );
    case "timeline":
      return <Timeline items={b.items} gaps={b.gaps} title="TIMELINE" />;
    case "quote":
      return (
        <QuoteCard quote={b.quote} speaker={b.speaker} context={b.context} />
      );
    case "title":
      return <SectionTitle title={b.title} />;
    case "map":
      return <MapPlaceholder markers={b.markers} />;
    case "pending":
      return (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            padding: 160,
            fontFamily: theme.font.sans,
            color: theme.color.textMuted,
          }}
        >
          <div style={{ fontSize: 24, letterSpacing: 4 }}>
            ASSET PENDING · {b.shotType}
          </div>
          <div style={{ fontSize: 40, marginTop: 20, color: theme.color.text }}>
            {b.visualIntent}
          </div>
        </AbsoluteFill>
      );
  }
};
