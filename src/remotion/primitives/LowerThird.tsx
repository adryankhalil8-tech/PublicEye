import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, theme } from "../theme";

/**
 * Name identifier. `role` must be a neutral, sourced description
 * ("Bookkeeper · Charged, later acquitted"), never a guilt label.
 */
export const LowerThird: React.FC<{
  name: string;
  role?: string;
  top?: number;
}> = ({ name, role, top = 110 }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 150,
        top,
        opacity: interpolate(frame, [4, 20], [0, 1], clamp),
      }}
    >
      <div style={{ fontFamily: theme.font.serif, fontSize: 44 }}>{name}</div>
      <div
        style={{
          height: 2,
          backgroundColor: theme.color.rule,
          margin: "10px 0",
          width: interpolate(frame, [4, 30], [0, 320], clamp),
        }}
      />
      {role ? (
        <div
          style={{
            fontFamily: theme.font.sans,
            fontSize: 24,
            color: theme.color.textMuted,
          }}
        >
          {role}
        </div>
      ) : null}
    </div>
  );
};
