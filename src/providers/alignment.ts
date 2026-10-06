import {
  SCHEMA_VERSION,
  type AlignmentSource,
  type CaptionEntry,
  type NarrationAlignment,
  type NarrationArtifact,
  type ScriptDocument,
} from "../domain";
import {
  estimateNarrationSpans,
  type NarrationSpan,
} from "../production/timing";
import type { ProviderInfo } from "./policy";

export type AlignmentRequest = {
  script: ScriptDocument;
  /** Measured narration. Absent only for the drafting estimate. */
  narration?: NarrationArtifact;
  createdAt: string;
};

/**
 * Places each narration unit (and optionally each word) on the narration
 * audio timeline. The script text is already verified, so forced alignment
 * — keeping the exact text — is preferred over open transcription.
 *
 * Implementations:
 * - EstimatedAlignmentProvider     LOCAL  drafting only (word counts)
 * - per-unit synthesis             LOCAL  exact; scripts/narrate.ts
 * Planned (free/local, none required):
 * - WhisperCppAlignmentProvider    LOCAL  (@remotion/install-whisper-cpp)
 * - FasterWhisperAlignmentProvider LOCAL  (Python, external process)
 * - ManualAlignmentProvider        LOCAL  (hand-timed JSON / SRT import)
 */
export interface NarrationAlignmentProvider {
  readonly info: ProviderInfo;
  readonly source: AlignmentSource;
  align(request: AlignmentRequest): Promise<NarrationAlignment>;
}

/**
 * Spread each unit's words evenly across its span. Used for estimates and
 * for per-unit synthesis (where unit spans are exact but word times are not).
 */
export const wordsFromSpans = (
  script: ScriptDocument,
  spans: NarrationSpan[],
): CaptionEntry[] => {
  const words: CaptionEntry[] = [];
  script.units.forEach((unit, i) => {
    const span = spans[i];
    if (!span) return;
    const tokens = unit.text.split(/\s+/).filter(Boolean);
    const speechMs = Math.max(
      1,
      span.endMs - span.startMs - unit.pauseAfterSec * 1000,
    );
    const per = speechMs / tokens.length;
    tokens.forEach((w, k) => {
      const s = Math.round(span.startMs + k * per);
      // Leading space follows Remotion's caption convention for word joins.
      words.push({
        text: words.length === 0 ? w : ` ${w}`,
        startMs: s,
        endMs: Math.round(s + per),
        timestampMs: s,
        confidence: null,
      });
    });
  });
  return words;
};

export const alignmentFromSpans = (
  script: ScriptDocument,
  spans: NarrationSpan[],
  opts: {
    narrationId: string;
    source: AlignmentSource;
    createdAt: string;
    audioDurationSec?: number;
    tool?: string;
  },
): NarrationAlignment => ({
  schemaVersion: SCHEMA_VERSION,
  kind: "narration-alignment",
  narrationId: opts.narrationId,
  alignmentSource: opts.source,
  tool: opts.tool,
  createdAt: opts.createdAt,
  audioDurationSec:
    opts.audioDurationSec ?? Math.max(0, ...spans.map((s) => s.endMs)) / 1000,
  segments: spans.map((s, i) => ({
    id: `seg-${String(i + 1).padStart(3, "0")}`,
    narrationUnitId: s.narrationId,
    startSec: s.startMs / 1000,
    endSec: s.endMs / 1000,
    durationSec: (s.endMs - s.startMs) / 1000,
    text: script.units[i].text,
  })),
  words: wordsFromSpans(script, spans),
});

/** Drafting-only alignment from word counts. Never times a REVIEW/FINAL render. */
export const buildEstimatedAlignment = (
  script: ScriptDocument,
  createdAt: string,
): NarrationAlignment =>
  alignmentFromSpans(script, estimateNarrationSpans(script), {
    narrationId: "narr-estimate",
    source: "ESTIMATED",
    createdAt,
    tool: "word-count estimate",
  });

export class EstimatedAlignmentProvider implements NarrationAlignmentProvider {
  readonly info: ProviderInfo = {
    id: "estimated",
    displayName: "Script-based estimate",
    costTier: "LOCAL",
    requiresNetwork: false,
    requiresApiKey: false,
  };
  readonly source = "ESTIMATED" as const;

  async align({
    script,
    createdAt,
  }: AlignmentRequest): Promise<NarrationAlignment> {
    return buildEstimatedAlignment(script, createdAt);
  }
}
