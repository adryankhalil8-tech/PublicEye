import React from "react";
import {
  REPRESENTATION_LABELS,
  type RepresentationLabel as LabelKind,
} from "../../domain";
import { theme } from "../theme";

/**
 * On-screen disclosure for non-authentic imagery. Deliberately has no fade
 * or timing props: it is visible for the whole shot, every time.
 */
export const RepresentationLabel: React.FC<{ kind: LabelKind }> = ({
  kind,
}) => (
  <div
    style={{
      position: "absolute",
      top: 54,
      left: 96,
      fontFamily: theme.font.sans,
      fontSize: 22,
      fontWeight: 600,
      letterSpacing: 3,
      textTransform: "uppercase",
      color: theme.color.ground,
      backgroundColor: theme.color.label,
      padding: "8px 16px",
    }}
  >
    {REPRESENTATION_LABELS[kind]}
  </div>
);
