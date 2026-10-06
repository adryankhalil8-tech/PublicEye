import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

/**
 * Narration-aligned subtitles. Accepts Remotion `Caption[]` from any timing
 * source (estimate, whisper.cpp, manual). Pages are grouped into readable
 * lines; no per-word karaoke highlighting — this is a documentary.
 */
export const CaptionLayer: React.FC<{
  captions: Caption[];
  /** Max span of one on-screen caption page. */
  pageMs?: number;
}> = ({ captions, pageMs = 2400 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;

  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions,
        combineTokensWithinMilliseconds: pageMs,
      }),
    [captions, pageMs],
  );
  const page = pages.find(
    (p) => nowMs >= p.startMs && nowMs < p.startMs + p.durationMs,
  );
  if (!page) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 72,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          fontFamily: theme.font.sans,
          fontSize: 40,
          lineHeight: 1.3,
          color: theme.color.text,
          backgroundColor: "rgba(10, 10, 9, 0.72)",
          padding: "10px 22px",
          textAlign: "center",
          whiteSpace: "pre-wrap",
        }}
      >
        {page.text.trim()}
      </div>
    </AbsoluteFill>
  );
};
