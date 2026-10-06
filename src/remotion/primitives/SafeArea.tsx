import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";

/** Keeps text inside the 90% title-safe region. */
export const SafeArea: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <AbsoluteFill
    style={{
      padding: `${theme.safeInset * 100}% ${theme.safeInset * 100}%`,
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);
