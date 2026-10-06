import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";

/**
 * Base canvas for every scene: ground color and a soft vignette.
 * `synthetic` stamps a permanent notice so fixture renders can never be
 * mistaken for a real case. `themeVariables` applies a case visual bible
 * (see visualBibleVariables in ../theme).
 */
export const DocumentaryFrame: React.FC<{
  children?: React.ReactNode;
  synthetic?: boolean;
  themeVariables?: React.CSSProperties;
}> = ({ children, synthetic = false, themeVariables }) => (
  <AbsoluteFill
    style={{
      ...themeVariables,
      backgroundColor: theme.color.ground,
      color: theme.color.text,
    }}
  >
    {children}
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background:
          "radial-gradient(ellipse at 45% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
      }}
    />
    {synthetic ? (
      <div
        style={{
          position: "absolute",
          top: 36,
          right: 48,
          fontFamily: theme.font.sans,
          fontSize: 18,
          letterSpacing: 2,
          color: theme.color.textMuted,
          border: `1px solid ${theme.color.rule}`,
          padding: "6px 12px",
        }}
      >
        SYNTHETIC TEST FIXTURE · FICTIONAL CASE
      </div>
    ) : null}
  </AbsoluteFill>
);
