import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, theme } from "../theme";

export type DocumentLine = {
  text: string;
  /** Mark as the key passage (highlighter sweep). */
  highlight?: boolean;
  /** Struck through: a claim the record contradicts. */
  strike?: boolean;
  /** Small margin label, e.g. "Online claim". */
  marginNote?: string;
};

/**
 * A record on paper. Renders typeset excerpts (verbatim text from evidence),
 * clearly footnoted as not being a facsimile. Real scans will use PhotoFrame
 * or a future scan-viewer; this component never pretends to be one.
 */
export const DocumentViewer: React.FC<{
  heading: string;
  subheading?: string;
  lines: DocumentLine[];
  /** Frame (within the shot) at which highlights begin sweeping. */
  highlightAtFrame?: number;
  /** DIM_OTHERS state: frame at which non-highlighted lines recede. */
  dimAtFrame?: number;
  textureSrc?: string;
  footnote?: string;
}> = ({
  heading,
  subheading,
  lines,
  highlightAtFrame = 30,
  dimAtFrame,
  textureSrc,
  footnote = "Typeset excerpt — not a facsimile of the original",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        left: 150,
        top: 90,
        width: 1080,
        height: 700,
        opacity: interpolate(frame, [0, theme.fadeFrames], [0, 1], clamp),
        // Slow push-in across the whole shot; restrained (max 4%).
        scale: interpolate(frame, [0, durationInFrames], [1, 1.04], clamp),
        transformOrigin: "40% 45%",
        backgroundColor: theme.color.paper,
        backgroundImage: textureSrc ? `url(${textureSrc})` : undefined,
        backgroundSize: "512px 512px",
        boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        padding: "72px 84px",
        color: theme.color.paperInk,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontFamily: theme.font.mono,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 1,
        }}
      >
        {heading}
      </div>
      {subheading ? (
        <div
          style={{
            fontFamily: theme.font.mono,
            fontSize: 22,
            color: theme.color.paperMuted,
            marginTop: 8,
          }}
        >
          {subheading}
        </div>
      ) : null}
      <div
        style={{
          height: 2,
          backgroundColor: theme.color.paperMuted,
          opacity: 0.4,
          margin: "28px 0 36px",
        }}
      />
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            marginBottom: 30,
            opacity:
              dimAtFrame !== undefined && !line.highlight
                ? interpolate(
                    frame,
                    [dimAtFrame, dimAtFrame + 18],
                    [1, 0.35],
                    clamp,
                  )
                : 1,
          }}
        >
          {line.highlight ? (
            <div
              style={{
                position: "absolute",
                left: -8,
                top: 2,
                height: "100%",
                backgroundColor: theme.color.highlight,
                width: interpolate(
                  frame,
                  [highlightAtFrame, highlightAtFrame + 24],
                  ["0%", "102%"],
                  {
                    ...clamp,
                    easing: Easing.bezier(0.33, 0, 0.2, 1),
                  },
                ),
              }}
            />
          ) : null}
          <div
            style={{
              position: "relative",
              fontFamily: theme.font.mono,
              fontSize: 30,
              lineHeight: 1.45,
              textDecoration: line.strike ? "line-through" : undefined,
              textDecorationColor: theme.color.strike,
              textDecorationThickness: 3,
              color: line.strike
                ? theme.color.paperMuted
                : theme.color.paperInk,
            }}
          >
            {line.text}
          </div>
          {line.marginNote ? (
            <div
              style={{
                fontFamily: theme.font.sans,
                fontSize: 18,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: line.strike
                  ? theme.color.strike
                  : theme.color.paperMuted,
                marginTop: 6,
              }}
            >
              {line.marginNote}
            </div>
          ) : null}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 84,
          fontFamily: theme.font.sans,
          fontSize: 16,
          color: theme.color.paperMuted,
        }}
      >
        {footnote}
      </div>
    </div>
  );
};
