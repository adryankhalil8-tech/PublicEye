import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, theme } from "../theme";

/** Small, persistent on-screen citation, bottom-left above captions. */
export const SourceCitation: React.FC<{
  sources: { title: string; publisher: string }[];
}> = ({ sources }) => {
  const frame = useCurrentFrame();
  if (sources.length === 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        bottom: 180,
        maxWidth: 900,
        fontFamily: theme.font.sans,
        fontSize: 20,
        lineHeight: 1.4,
        color: theme.color.textMuted,
        opacity: interpolate(frame, [15, 35], [0, 1], clamp),
      }}
    >
      <span style={{ letterSpacing: 2, marginRight: 12 }}>SOURCE</span>
      {sources.map((s) => `${s.title}, ${s.publisher}`).join(" · ")}
    </div>
  );
};
