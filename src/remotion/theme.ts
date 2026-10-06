import type { CSSProperties } from "react";
import type { CaseVisualBible } from "../domain";

/**
 * Visual language: serious, archival, investigative. Warm near-black ground,
 * paper for records, one muted highlight color. No neon, no glass, no glow.
 *
 * These are the HOUSE DEFAULTS. A case's CaseVisualBible overrides them:
 * every token is a CSS custom property with the default as fallback, and
 * `visualBibleVariables()` sets the properties once at the frame root. So a
 * primitive written as `color: theme.color.text` follows the approved bible
 * without knowing it exists.
 */
export const HOUSE_STYLE = {
  color: {
    ground: "#0f0e0c",
    groundRaised: "#191815",
    text: "#ece6da",
    textMuted: "#9a9282",
    rule: "#4a463e",
    paper: "#e6dfcf",
    paperInk: "#221f1a",
    paperMuted: "#6f685b",
    highlight: "rgba(201, 164, 84, 0.42)",
    strike: "#8a3a2e",
    label: "#d8cfbd",
  },
  font: {
    serif: "Georgia, 'Times New Roman', serif",
    sans: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    mono: "'Courier New', Courier, monospace",
  },
} as const;

type ColorToken = keyof typeof HOUSE_STYLE.color;
type FontToken = keyof typeof HOUSE_STYLE.font;

const cssVar = (name: string, fallback: string) =>
  `var(--pe-${name}, ${fallback})`;

export const theme = {
  color: Object.fromEntries(
    Object.entries(HOUSE_STYLE.color).map(([k, v]) => [
      k,
      cssVar(`color-${k}`, v),
    ]),
  ) as Record<ColorToken, string>,
  font: Object.fromEntries(
    Object.entries(HOUSE_STYLE.font).map(([k, v]) => [
      k,
      cssVar(`font-${k}`, v),
    ]),
  ) as Record<FontToken, string>,
  /** Title-safe inset as a fraction of frame size (90% safe area). */
  safeInset: 0.05,
  /** Standard fade for entrances, in frames at 30fps. */
  fadeFrames: 12,
} as const;

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/** CSS custom properties that apply a visual bible to everything below. */
export const visualBibleVariables = (
  bible?: CaseVisualBible,
): CSSProperties => {
  if (!bible) return {};
  const p = bible.palette;
  const vars: Record<string, string> = {
    "--pe-color-ground": p.ground,
    "--pe-color-groundRaised": p.groundRaised,
    "--pe-color-text": p.text,
    "--pe-color-textMuted": p.textMuted,
    "--pe-color-rule": p.rule,
    "--pe-color-paper": p.paper,
    "--pe-color-paperInk": p.paperInk,
    // Highlight is a translucent marker over paper (≈42% opacity).
    "--pe-color-highlight": `${p.highlight}6b`,
    "--pe-color-strike": p.strike,
    "--pe-color-label": p.label,
    "--pe-font-serif": bible.typography.titles,
    "--pe-font-sans": bible.typography.body,
    "--pe-font-mono": bible.typography.records,
  };
  return vars as CSSProperties;
};
