import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RepresentationLabel as LabelKind } from "../../domain";
import { clamp, theme } from "../theme";
import { RepresentationLabel } from "./RepresentationLabel";

/**
 * Full-frame still with a very slow drift. If the image is not an authentic
 * record, pass `label` — the disclosure is then burned in for the whole shot.
 */
export const PhotoFrame: React.FC<{
  src: string;
  label?: LabelKind;
  credit?: string;
  movement?: "STATIC" | "SLOW_PUSH_IN" | "SLOW_PULL_OUT";
}> = ({ src, label, credit, movement = "SLOW_PUSH_IN" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const range: [number, number] =
    movement === "SLOW_PUSH_IN"
      ? [1, 1.05]
      : movement === "SLOW_PULL_OUT"
        ? [1.05, 1]
        : [1, 1];

  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(frame, [0, theme.fadeFrames], [0, 1], clamp),
      }}
    >
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          scale: interpolate(frame, [0, durationInFrames], range, clamp),
        }}
      />
      {label ? <RepresentationLabel kind={label} /> : null}
      {credit ? (
        <div
          style={{
            position: "absolute",
            right: 96,
            bottom: 180,
            fontFamily: theme.font.sans,
            fontSize: 18,
            color: theme.color.textMuted,
          }}
        >
          {credit}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
