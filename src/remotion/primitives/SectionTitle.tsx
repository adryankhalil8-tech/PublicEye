import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { clamp, theme } from "../theme";
import { SafeArea } from "./SafeArea";

/** Chapter card, left-aligned in the lower third — not dead-center. */
export const SectionTitle: React.FC<{ title: string; kicker?: string }> = ({
  title,
  kicker,
}) => {
  const frame = useCurrentFrame();
  return (
    <SafeArea style={{ justifyContent: "flex-end", paddingBottom: "16%" }}>
      <div style={{ marginLeft: 60 }}>
        {kicker ? (
          <div
            style={{
              fontFamily: theme.font.sans,
              fontSize: 24,
              letterSpacing: 5,
              color: theme.color.textMuted,
              opacity: interpolate(frame, [0, 16], [0, 1], clamp),
            }}
          >
            {kicker.toUpperCase()}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: theme.font.serif,
            fontSize: 96,
            marginTop: 18,
            opacity: interpolate(frame, [6, 26], [0, 1], clamp),
            translate: interpolate(frame, [6, 36], ["0px 14px", "0px 0px"], {
              ...clamp,
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          {title}
        </div>
      </div>
    </SafeArea>
  );
};
