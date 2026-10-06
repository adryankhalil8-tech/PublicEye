import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, theme } from "../theme";

/** Place identifier, lower-left. Pair with a map, photo, or plain ground. */
export const LocationCard: React.FC<{ name: string; detail?: string }> = ({
  name,
  detail,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        bottom: 260,
        opacity: interpolate(frame, [6, 24], [0, 1], clamp),
      }}
    >
      <div
        style={{
          fontFamily: theme.font.sans,
          fontSize: 22,
          letterSpacing: 4,
          color: theme.color.textMuted,
        }}
      >
        LOCATION
      </div>
      <div
        style={{ fontFamily: theme.font.serif, fontSize: 64, marginTop: 10 }}
      >
        {name}
      </div>
      {detail ? (
        <div
          style={{
            fontFamily: theme.font.sans,
            fontSize: 28,
            marginTop: 8,
            color: theme.color.textMuted,
          }}
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
};
