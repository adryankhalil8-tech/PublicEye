import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, theme } from "../theme";

export type MapMarker = {
  label: string;
  /** Relative position in the schematic, 0–1. Not geographic. */
  x: number;
  y: number;
};

/**
 * Schematic stand-in until real map rendering (MapLibre / public-domain
 * basemaps via the official remotion-maps skill) lands in Phase 2.
 * Always marked "schematic · not to scale".
 */
export const MapPlaceholder: React.FC<{
  markers: MapMarker[];
  connect?: boolean;
}> = ({ markers, connect = true }) => {
  const frame = useCurrentFrame();
  const box = { left: 360, top: 170, width: 1200, height: 640 };
  const pts = markers.map((m) => ({
    ...m,
    px: box.left + m.x * box.width,
    py: box.top + m.y * box.height,
  }));
  const draw = interpolate(frame, [15, 50], [0, 1], clamp);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: interpolate(frame, [0, theme.fadeFrames], [0, 1], clamp),
      }}
    >
      <div
        style={{
          position: "absolute",
          ...box,
          border: `1px solid ${theme.color.rule}`,
          backgroundColor: theme.color.groundRaised,
        }}
      />
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0 }}
      >
        {connect && pts.length > 1
          ? pts.slice(1).map((p, i) => {
              const a = pts[i];
              const len = Math.hypot(p.px - a.px, p.py - a.py);
              return (
                <line
                  key={i}
                  x1={a.px}
                  y1={a.py}
                  x2={p.px}
                  y2={p.py}
                  style={{ stroke: theme.color.textMuted }}
                  strokeWidth={2}
                  strokeDasharray={`${len}`}
                  strokeDashoffset={len * (1 - draw)}
                />
              );
            })
          : null}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.px}
            cy={p.py}
            r={9}
            style={{ fill: theme.color.text }}
          />
        ))}
      </svg>
      {pts.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.px + 22,
            top: p.py - 20,
            fontFamily: theme.font.sans,
            fontSize: 28,
            color: theme.color.text,
            opacity: interpolate(
              frame,
              [20 + i * 8, 34 + i * 8],
              [0, 1],
              clamp,
            ),
          }}
        >
          {p.label}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: box.left,
          top: box.top + box.height + 16,
          fontFamily: theme.font.sans,
          fontSize: 16,
          letterSpacing: 2,
          color: theme.color.textMuted,
        }}
      >
        SCHEMATIC · NOT TO SCALE
      </div>
    </div>
  );
};
