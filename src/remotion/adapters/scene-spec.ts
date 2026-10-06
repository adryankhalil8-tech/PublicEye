import type {
  CaseClaim,
  CaseWorkspace,
  ProductionManifest,
  RepresentationLabel,
  Shot,
} from "../../domain";
import { formatDateSpec } from "../../domain";
import type { DocumentLine } from "../primitives/DocumentViewer";
import type { EvidenceCard } from "../primitives/EvidenceBoard";
import type { MapMarker } from "../primitives/MapPlaceholder";
import type { TimelineItem } from "../primitives/Timeline";

/**
 * Renderer-side mapping from a planned shot to concrete scene props.
 * This is the ONLY place that knows which primitive draws which ShotType;
 * visual plans stay renderer-independent. Pure and deterministic → testable.
 */
export type SceneBody =
  | {
      kind: "document";
      heading: string;
      subheading?: string;
      lines: DocumentLine[];
      highlightAtFrame: number;
      /** Frame at which non-highlighted lines dim (DIM_OTHERS state). */
      dimAtFrame?: number;
      texturePath?: string;
    }
  | { kind: "date"; date: string; caption?: string }
  | {
      kind: "photo";
      assetPath: string;
      credit?: string;
      movement: "STATIC" | "SLOW_PUSH_IN" | "SLOW_PULL_OUT";
    }
  | { kind: "evidence"; cards: EvidenceCard[]; name?: string }
  | {
      kind: "timeline";
      items: TimelineItem[];
      gaps: { fromId: string; toId: string }[];
    }
  | { kind: "quote"; quote: string; speaker: string; context?: string }
  | { kind: "title"; title: string }
  | { kind: "map"; markers: MapMarker[] }
  | { kind: "pending"; shotType: string; visualIntent: string };

export type SceneSpec = {
  shotId: string;
  startFrame: number;
  durationInFrames: number;
  /** Fade in over this many frames (transition INTO the shot). 0 = hard cut. */
  fadeInFrames: number;
  /** On-screen disclosure, present for every ILLUSTRATIVE shot. */
  representationLabel?: RepresentationLabel;
  citations: { title: string; publisher: string }[];
  body: SceneBody;
};

const MARKER_LAYOUT: [number, number][] = [
  [0.28, 0.38],
  [0.7, 0.66],
  [0.5, 0.2],
  [0.2, 0.75],
];

/**
 * Visual states arrive pre-timed in the manifest (resolved from measured
 * narration); the renderer only executes them.
 */
export const buildSceneSpecs = (
  ws: CaseWorkspace,
  manifest: ProductionManifest,
): SceneSpec[] => {
  const claims = new Map(ws.claims.claims.map((c) => [c.id, c]));
  const sources = new Map(ws.sources.sources.map((s) => [s.id, s]));
  const shots = new Map((ws.visualPlan?.shots ?? []).map((s) => [s.id, s]));
  const units = new Map((ws.script?.units ?? []).map((u) => [u.id, u]));
  const assets = new Map((ws.assets?.assets ?? []).map((a) => [a.id, a]));

  return manifest.shots.map((m) => {
    const shot = shots.get(m.shotId);
    if (!shot) throw new Error(`manifest references unknown shot ${m.shotId}`);

    const shotClaimIds = new Set([
      ...shot.narrationIds.flatMap((id) => units.get(id)?.claimIds ?? []),
      ...shot.onScreenText.flatMap((t) => t.claimIds),
      ...shot.beats.flatMap((b) => b.claimIds),
    ]);
    const text = (role: string) =>
      shot.onScreenText.filter((t) => t.role === role);
    const shotAssets = m.assetIds
      .map((id) => assets.get(id))
      .filter((a) => a !== undefined);

    const body = ((): SceneBody => {
      switch (shot.shotType) {
        case "DOCUMENT_HIGHLIGHT":
        case "COURT_DOCUMENT":
        case "NEWSPAPER":
          return documentBody(
            shot,
            shotClaimIds,
            claims,
            sources,
            m.states,
            shotAssets.find((a) => a.mediaType === "TEXTURE")?.localPath,
          );
        case "DATE_CARD":
          return {
            kind: "date",
            date: text("DATE")[0]?.text ?? "",
            caption: text("LABEL")[0]?.text,
          };
        case "RECONSTRUCTION":
        case "ARCHIVAL_PHOTO":
        case "PORTRAIT":
        case "LOCATION":
        case "ATMOSPHERIC_BROLL": {
          const image = shotAssets.find((a) => a.mediaType === "IMAGE");
          if (!image)
            return {
              kind: "pending",
              shotType: shot.shotType,
              visualIntent: shot.visualIntent,
            };
          const mv = shot.cameraDirection?.movement;
          return {
            kind: "photo",
            assetPath: image.localPath,
            credit: image.creditText,
            movement:
              mv === "STATIC" || mv === "SLOW_PULL_OUT" ? mv : "SLOW_PUSH_IN",
          };
        }
        case "EVIDENCE_DIAGRAM": {
          const disputed = shot.narrationIds.some(
            (id) => units.get(id)?.framing === "DISPUTED",
          );
          const cards = text("LABEL").map((t) => {
            const claim = claims.get(t.claimIds[0]);
            return {
              attribution: claim ? attributionFor(claim) : "Unattributed",
              text: t.text,
              source: claim ? supportingPublisher(claim, sources) : undefined,
              disputed,
            };
          });
          return { kind: "evidence", cards, name: text("NAME")[0]?.text };
        }
        case "TIMELINE":
          return {
            kind: "timeline",
            items: ws.timeline.events.map((e) => ({
              id: e.id,
              label: e.description,
              dateLabel: formatDateSpec(e.when),
              precision: e.when.precision,
              emphasis: e.claimIds.some((id) => shotClaimIds.has(id)),
            })),
            gaps: ws.timeline.gaps.flatMap((g) =>
              g.afterEventId && g.beforeEventId
                ? [{ fromId: g.afterEventId, toId: g.beforeEventId }]
                : [],
            ),
          };
        case "QUOTE": {
          const q = text("QUOTE")[0];
          const claim = q ? claims.get(q.claimIds[0]) : undefined;
          const speaker =
            claim?.assertion.type === "QUOTE"
              ? claim.assertion.speaker
              : "Unattributed";
          return {
            kind: "quote",
            quote: q?.text ?? "",
            speaker,
            context: text("DATE")[0]?.text,
          };
        }
        case "TYPOGRAPHY":
          return { kind: "title", title: text("TITLE")[0]?.text ?? "" };
        case "MAP":
          return {
            kind: "map",
            markers: text("LOCATION").map((t, i) => {
              const [x, y] = MARKER_LAYOUT[i % MARKER_LAYOUT.length];
              return { label: t.text, x, y };
            }),
          };
        default:
          return {
            kind: "pending",
            shotType: shot.shotType,
            visualIntent: shot.visualIntent,
          };
      }
    })();

    const transition = shot.transitionDirection?.type ?? "CUT";
    return {
      shotId: shot.id,
      startFrame: m.startFrame,
      durationInFrames: m.durationInFrames,
      fadeInFrames:
        transition === "DISSOLVE"
          ? 12
          : transition === "FADE_THROUGH_BLACK"
            ? 18
            : 0,
      representationLabel:
        shot.representation.type === "ILLUSTRATIVE"
          ? shot.representation.label
          : undefined,
      citations: shot.citationSourceIds
        .map((id) => sources.get(id))
        .filter((s) => s !== undefined)
        .map((s) => ({ title: s.title, publisher: s.publisher })),
      body,
    };
  });
};

const attributionFor = (claim: CaseClaim): string => {
  const a = claim.assertion;
  if (a.type === "ATTRIBUTED")
    return `${a.attributedTo} · ${a.verb.toLowerCase()}`;
  if (a.type === "QUOTE") return a.speaker;
  if (claim.status === "DISPUTED") return "Disputed";
  return "Record";
};

const supportingPublisher = (
  claim: CaseClaim,
  sources: Map<string, { publisher: string }>,
) => {
  const e = claim.evidence.find((x) => x.stance === "SUPPORTS");
  return e ? sources.get(e.reference.sourceId)?.publisher : undefined;
};

const documentBody = (
  shot: Shot,
  shotClaimIds: Set<string>,
  claims: Map<string, CaseClaim>,
  sources: Map<
    string,
    { title: string; publisher: string; recordIdentifier?: string }
  >,
  states: ProductionManifest["shots"][number]["states"],
  texturePath?: string,
): SceneBody => {
  const cited = new Set(shot.citationSourceIds);
  // Lines for claims named by HIGHLIGHT states (or by unstated legacy beats).
  const beatClaims = new Set(
    shot.beats
      .filter((b) => !b.state || b.state === "HIGHLIGHT")
      .flatMap((b) => b.claimIds),
  );
  const struck: DocumentLine[] = [];
  const record: DocumentLine[] = [];
  const seen = new Set<string>();

  for (const id of shotClaimIds) {
    const claim = claims.get(id);
    if (!claim) continue;
    for (const e of claim.evidence) {
      const excerpt = e.reference.excerpt;
      if (!excerpt || e.stance !== "SUPPORTS" || seen.has(excerpt)) continue;
      if (claim.status === "CONTRADICTED") {
        seen.add(excerpt);
        struck.push({
          text: excerpt,
          strike: true,
          marginNote: "Online claim · contradicted by the court record",
        });
      } else if (cited.has(e.reference.sourceId)) {
        seen.add(excerpt);
        record.push({ text: excerpt, highlight: beatClaims.has(claim.id) });
      }
    }
  }

  const highlight =
    states.find((st) => st.state === "HIGHLIGHT") ??
    states.find((st) => !st.state);
  const highlightAtFrame = highlight?.atFrame ?? 30;
  const dimAtFrame = states.find((st) => st.state === "DIM_OTHERS")?.atFrame;

  const primary = sources.get(shot.citationSourceIds[0]);
  return {
    kind: "document",
    heading: primary?.title ?? "Record",
    subheading: primary
      ? [primary.publisher, primary.recordIdentifier]
          .filter(Boolean)
          .join(" · ")
      : undefined,
    lines: [...struck, ...record],
    highlightAtFrame,
    dimAtFrame,
    texturePath,
  };
};
