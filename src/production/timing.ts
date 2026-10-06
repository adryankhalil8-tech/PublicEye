import type {
  CaseWorkspace,
  NarrationAlignment,
  ScriptDocument,
  Shot,
  VisualPlan,
} from "../domain";
import { isMeasuredAlignment } from "../domain";
import { estimateUnitDurationSec } from "../storytelling/duration";

/** Where one narration unit sits on the narration timeline, in ms. */
export type NarrationSpan = {
  narrationId: string;
  startMs: number;
  endMs: number;
};

/** Drafting only: spans from word-count estimates (no audio yet). */
export const estimateNarrationSpans = (
  script: ScriptDocument,
): NarrationSpan[] => {
  let cursor = 0;
  return script.units.map((u) => {
    const durMs = Math.round(
      estimateUnitDurationSec(u, script.wordsPerMinute) * 1000,
    );
    const span = { narrationId: u.id, startMs: cursor, endMs: cursor + durMs };
    cursor += durMs;
    return span;
  });
};

/** Spans from an alignment (measured or estimated). */
export const spansFromAlignment = (
  alignment: NarrationAlignment,
): NarrationSpan[] =>
  alignment.segments.map((s) => ({
    narrationId: s.narrationUnitId,
    startMs: Math.round(s.startSec * 1000),
    endMs: Math.round(s.endSec * 1000),
  }));

export type ShotTiming = {
  shotId: string;
  startFrame: number;
  durationInFrames: number;
};

/**
 * Cut shots on the narration timeline. A shot starts where its first
 * narration segment starts (the first shot starts at 0) and ends where the
 * next shot starts; the last shot ends with the audio. Pauses between units
 * therefore stay inside shots and picture never drifts from sound.
 *
 * Frames are computed from absolute boundaries, so rounding never
 * accumulates across a 10-minute video.
 */
export const computeShotTimings = (
  visualPlan: VisualPlan,
  spans: NarrationSpan[],
  fps: number,
  totalMs?: number,
): ShotTiming[] => {
  const byId = new Map(spans.map((s) => [s.narrationId, s]));
  const endMs = totalMs ?? Math.max(0, ...spans.map((s) => s.endMs));
  const starts = visualPlan.shots.map((shot, i) => {
    if (i === 0) return 0;
    const known = shot.narrationIds
      .map((id) => byId.get(id)?.startMs)
      .filter((v): v is number => v !== undefined);
    return known.length ? Math.min(...known) : undefined;
  });
  // Shots whose narration is unknown inherit the previous boundary.
  for (let i = 1; i < starts.length; i++) starts[i] ??= starts[i - 1];

  const toFrame = (ms: number) => Math.round((ms / 1000) * fps);
  return visualPlan.shots.map((shot, i) => {
    const startFrame = toFrame(starts[i]!);
    const nextFrame =
      i + 1 < starts.length ? toFrame(starts[i + 1]!) : toFrame(endMs);
    return {
      shotId: shot.id,
      startFrame,
      durationInFrames: Math.max(1, nextFrame - startFrame),
    };
  });
};

export type ResolvedState = {
  beatId: string;
  state?: Shot["beats"][number]["state"];
  target?: string;
  /** Frame relative to the shot's start. */
  atFrame: number;
};

/**
 * Resolve a shot's visual states (scene beats) to frames. A beat anchored to
 * a narration unit starts at that unit's segment start plus offset; an
 * unanchored beat is offset from the shot start.
 */
export const resolveBeatFrames = (
  shot: Shot,
  shotStartFrame: number,
  spans: NarrationSpan[],
  fps: number,
): ResolvedState[] => {
  const byId = new Map(spans.map((s) => [s.narrationId, s]));
  return shot.beats.map((b) => {
    const anchorMs = b.atNarrationId
      ? byId.get(b.atNarrationId)?.startMs
      : undefined;
    const absFrame =
      anchorMs !== undefined
        ? Math.round(((anchorMs + b.offsetSec * 1000) / 1000) * fps)
        : shotStartFrame + Math.round(b.offsetSec * fps);
    return {
      beatId: b.id,
      state: b.state,
      target: b.target,
      atFrame: Math.max(0, absFrame - shotStartFrame),
    };
  });
};

/** Timing basis for a workspace: measured narration if present, else estimate. */
export const timingFor = (
  ws: CaseWorkspace,
): { spans: NarrationSpan[]; totalMs?: number; measured: boolean } => {
  const a = ws.alignment;
  const measured =
    !!a &&
    isMeasuredAlignment(a.alignmentSource) &&
    ws.narration?.status === "MEASURED";
  if (a && (measured || a.alignmentSource === "ESTIMATED")) {
    return {
      spans: spansFromAlignment(a),
      totalMs: Math.round(a.audioDurationSec * 1000),
      measured,
    };
  }
  return { spans: estimateNarrationSpans(ws.script!), measured: false };
};
