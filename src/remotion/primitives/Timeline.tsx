import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, theme } from "../theme";

export type TimelineItem = {
  id: string;
  label: string;
  /** Pre-formatted with formatDateSpec() so uncertainty is preserved. */
  dateLabel: string;
  precision: "EXACT" | "APPROXIMATE" | "RANGE" | "UNKNOWN";
  emphasis?: boolean;
};

/**
 * Evenly spaced (ordinal, not to scale) so the graphic never implies timing
 * precision the sources lack. Marker shape encodes date precision:
 * solid = exact, hollow = approximate, bar = range, dashed = unknown.
 * `gaps` draw a dashed "undocumented" span between two items.
 */
export const Timeline: React.FC<{
  items: TimelineItem[];
  gaps?: { fromId: string; toId: string }[];
  title?: string;
}> = ({ items, gaps = [], title }) => {
  const frame = useCurrentFrame();
  const left = 160;
  const width = 1600;
  const y = 560;
  const step = items.length > 1 ? width / (items.length - 1) : 0;
  const indexOf = new Map(items.map((it, i) => [it.id, i]));

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {title ? (
        <div
          style={{
            position: "absolute",
            left,
            top: 150,
            fontFamily: theme.font.sans,
            fontSize: 24,
            letterSpacing: 4,
            color: theme.color.textMuted,
          }}
        >
          {title}
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left,
          top: y,
          height: 2,
          backgroundColor: theme.color.rule,
          width: interpolate(frame, [0, 40], [0, width], clamp),
        }}
      />
      {gaps.map((g) => {
        const from = indexOf.get(g.fromId);
        const to = indexOf.get(g.toId);
        if (from === undefined || to === undefined || to <= from) return null;
        return (
          <div
            key={`${g.fromId}-${g.toId}`}
            style={{
              position: "absolute",
              left: left + from * step + 16,
              top: y - 1,
              width: (to - from) * step - 32,
              height: 4,
              opacity: interpolate(frame, [30, 50], [0, 1], clamp),
              // Breaks the solid axis into dashes: no sources cover this span.
              backgroundImage: `repeating-linear-gradient(90deg, ${theme.color.ground} 0 8px, ${theme.color.textMuted} 8px 16px)`,
            }}
          />
        );
      })}
      {items.map((item, i) => {
        const x = left + i * step;
        const appear = interpolate(
          frame,
          [10 + i * 6, 24 + i * 6],
          [0, 1],
          clamp,
        );
        const color = item.emphasis ? theme.color.text : theme.color.textMuted;
        return (
          <React.Fragment key={item.id}>
            <div
              style={{
                position: "absolute",
                left: x - (item.precision === "RANGE" ? 30 : 11),
                top: y - 11,
                width: item.precision === "RANGE" ? 60 : 22,
                height: 22,
                borderRadius: item.precision === "RANGE" ? 11 : "50%",
                boxSizing: "border-box",
                opacity: appear,
                backgroundColor:
                  item.precision === "EXACT" || item.precision === "RANGE"
                    ? color
                    : theme.color.ground,
                border: `2px ${item.precision === "UNKNOWN" ? "dashed" : "solid"} ${color}`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: x - 130,
                width: 260,
                textAlign: "center",
                top: i % 2 === 0 ? y - 150 : y + 40,
                opacity: appear,
              }}
            >
              <div
                style={{ fontFamily: theme.font.serif, fontSize: 30, color }}
              >
                {item.dateLabel}
              </div>
              <div
                style={{
                  fontFamily: theme.font.sans,
                  fontSize: 21,
                  lineHeight: 1.3,
                  marginTop: 8,
                  color: theme.color.textMuted,
                }}
              >
                {item.label}
              </div>
            </div>
          </React.Fragment>
        );
      })}
      <div
        style={{
          position: "absolute",
          right: 160,
          top: y + 200,
          fontFamily: theme.font.sans,
          fontSize: 16,
          color: theme.color.textMuted,
        }}
      >
        Events in order · spacing not to scale
        {gaps.length ? " · dashed = undocumented period" : ""}
      </div>
    </div>
  );
};
