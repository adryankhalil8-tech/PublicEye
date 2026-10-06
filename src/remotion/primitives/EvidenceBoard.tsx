import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, theme } from "../theme";

export type EvidenceCard = {
  /** Who says so, e.g. "POLICE ALLEGED", "TRIAL TESTIMONY". Never omitted. */
  attribution: string;
  text: string;
  source?: string;
  /** Visual flag for contested items. */
  disputed?: boolean;
};

/**
 * Side-by-side attributed statements. Each card leads with its attribution so
 * an allegation can never read as an established fact.
 */
export const EvidenceBoard: React.FC<{
  cards: EvidenceCard[];
  staggerFrames?: number;
}> = ({ cards, staggerFrames = 20 }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 150,
        right: 150,
        top: 320,
        display: "flex",
        gap: 48,
        alignItems: "stretch",
      }}
    >
      {cards.map((card, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            backgroundColor: theme.color.groundRaised,
            borderTop: `3px solid ${card.disputed ? theme.color.strike : theme.color.rule}`,
            padding: "40px 44px",
            opacity: interpolate(
              frame,
              [i * staggerFrames, i * staggerFrames + 15],
              [0, 1],
              clamp,
            ),
            translate: interpolate(
              frame,
              [i * staggerFrames, i * staggerFrames + 20],
              ["0px 20px", "0px 0px"],
              clamp,
            ),
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
            {card.attribution.toUpperCase()}
          </div>
          <div
            style={{
              fontFamily: theme.font.serif,
              fontSize: 46,
              lineHeight: 1.25,
              marginTop: 24,
            }}
          >
            {card.text}
          </div>
          {card.source ? (
            <div
              style={{
                fontFamily: theme.font.sans,
                fontSize: 19,
                color: theme.color.textMuted,
                marginTop: 30,
              }}
            >
              {card.source}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};
