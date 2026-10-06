import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { clamp, theme } from "../theme";
import { SafeArea } from "./SafeArea";

/**
 * A date as a chapter marker. `date` should come from formatDateSpec() so
 * approximate/ranged dates keep their qualifier ("c. 1952", "1951 – 1953").
 */
export const DateCard: React.FC<{ date: string; caption?: string }> = ({
  date,
  caption,
}) => {
  const frame = useCurrentFrame();
  return (
    <SafeArea style={{ justifyContent: "center" }}>
      <div
        style={{
          marginLeft: 60,
          opacity: interpolate(frame, [0, theme.fadeFrames], [0, 1], clamp),
          translate: interpolate(frame, [0, 30], ["0px 16px", "0px 0px"], {
            ...clamp,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            width: 96,
            height: 2,
            backgroundColor: theme.color.rule,
            marginBottom: 36,
          }}
        />
        <div
          style={{
            fontFamily: theme.font.serif,
            fontSize: 112,
            lineHeight: 1.05,
            color: theme.color.text,
          }}
        >
          {date}
        </div>
        {caption ? (
          <div
            style={{
              fontFamily: theme.font.sans,
              fontSize: 34,
              marginTop: 28,
              color: theme.color.textMuted,
              opacity: interpolate(frame, [18, 36], [0, 1], clamp),
            }}
          >
            {caption}
          </div>
        ) : null}
      </div>
    </SafeArea>
  );
};
