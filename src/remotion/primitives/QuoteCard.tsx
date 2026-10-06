import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, theme } from "../theme";

/**
 * Verbatim quotation. Only feed it text from a SUPPORTED QUOTE claim —
 * validation rejects on-screen QUOTE text without one.
 */
export const QuoteCard: React.FC<{
  quote: string;
  speaker: string;
  context?: string;
}> = ({ quote, speaker, context }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 210, right: 360, top: 300 }}>
      <div
        style={{
          fontFamily: theme.font.serif,
          fontSize: 76,
          lineHeight: 1.2,
          opacity: interpolate(frame, [0, 20], [0, 1], clamp),
        }}
      >
        “{quote}”
      </div>
      <div
        style={{
          fontFamily: theme.font.sans,
          fontSize: 28,
          marginTop: 40,
          color: theme.color.textMuted,
          opacity: interpolate(frame, [24, 40], [0, 1], clamp),
        }}
      >
        — {speaker}
        {context ? `, ${context}` : ""}
      </div>
    </div>
  );
};
