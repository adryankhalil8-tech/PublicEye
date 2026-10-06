import { describe, expect, it } from "vitest";
import {
  estimateUnitDurationSec,
  spokenWordCount,
} from "../src/storytelling/duration";
import { lintScriptStyle } from "../src/storytelling/script-lint";
import type { NarrationUnit } from "../src/domain";
import { codes, errorCodes, find, issuesAfter } from "./helpers";

const unit = (id: string, text: string): NarrationUnit => ({
  id,
  sequenceId: "seq-hook",
  text,
  framing: "NON_FACTUAL",
  claimIds: [],
  pauseAfterSec: 0,
});

describe("story plan references", () => {
  it("rejects a reveal whose payoff comes before its setup", () => {
    const issues = issuesAfter((ws) => {
      const r = ws.story!.reveals[0];
      [r.setupSequenceId, r.payoffSequenceId] = [
        r.payoffSequenceId,
        r.setupSequenceId,
      ];
    });
    expect(errorCodes(issues)).toContain("REVEAL_ORDER");
  });

  it("rejects a hook built on an unverified claim", () => {
    const issues = issuesAfter((ws) => {
      ws.story!.hook.claimIds.push("clm-rumored-debts");
    });
    expect(errorCodes(issues)).toContain("HOOK_UNSUPPORTED");
  });

  it("flags broken event references in beats", () => {
    const issues = issuesAfter((ws) => {
      ws.story!.sequences[0].beats[0].eventIds.push("evt-nope");
    });
    expect(errorCodes(issues)).toContain("BROKEN_EVENT_REF");
  });
});

describe("script factual safety", () => {
  it("never allows an UNVERIFIED claim in narration", () => {
    const issues = issuesAfter((ws) => {
      find(ws.script!.units, "nu-006").claimIds.push("clm-rumored-debts");
    });
    expect(errorCodes(issues)).toContain("SCRIPT_USES_UNVERIFIED_CLAIM");
  });

  it("does not let STATED framing present a DISPUTED claim", () => {
    const issues = issuesAfter((ws) => {
      find(ws.script!.units, "nu-008").framing = "STATED";
    });
    expect(errorCodes(issues)).toContain("SCRIPT_FRAMING_MISMATCH");
  });

  it("only allows CONTRADICTED claims in a CORRECTION", () => {
    const issues = issuesAfter((ws) => {
      find(ws.script!.units, "nu-011").framing = "STATED";
    });
    expect(errorCodes(issues)).toContain("SCRIPT_FRAMING_MISMATCH");
  });

  it("catches an allegation rewritten as fact (attribution dropped)", () => {
    const issues = issuesAfter((ws) => {
      find(ws.script!.units, "nu-005").text =
        "Oren Tallis opened the safe himself.";
    });
    expect(errorCodes(issues)).toContain("ATTRIBUTION_DROPPED");
  });

  it("catches an accusation turned into a conviction", () => {
    const issues = issuesAfter((ws) => {
      find(ws.script!.units, "nu-007").text =
        "In December 1954, he was convicted of larceny.";
    });
    expect(errorCodes(issues)).toContain("LEGAL_TERM_UNSUPPORTED");
  });

  it("allows outcome words when the matching legal-status claim is cited", () => {
    const issues = issuesAfter(() => {});
    expect(codes(issues)).not.toContain("LEGAL_TERM_UNSUPPORTED");
  });

  it("flags guilt-presuming labels", () => {
    const issues = issuesAfter((ws) => {
      find(ws.script!.units, "nu-006").text =
        "The thief denied taking the money.";
    });
    expect(codes(issues)).toContain("GUILT_LABEL");
  });

  it("rejects quotation marks around words no verified quote supports", () => {
    const issues = issuesAfter((ws) => {
      find(ws.script!.units, "nu-006").text =
        'Tallis denied it: "I never touched that safe."';
    });
    expect(errorCodes(issues)).toContain("UNSOURCED_QUOTE");
  });

  it("accepts a verbatim quote backed by a SUPPORTED QUOTE claim", () => {
    const issues = issuesAfter(() => {});
    expect(codes(issues)).not.toContain("UNSOURCED_QUOTE");
  });

  it("requires factual units to cite claims and non-factual units not to", () => {
    const a = issuesAfter((ws) => {
      find(ws.script!.units, "nu-001").claimIds = [];
    });
    expect(errorCodes(a)).toContain("UNSOURCED_NARRATION");
    const b = issuesAfter((ws) => {
      find(ws.script!.units, "nu-014").claimIds = ["clm-tallis-acquitted"];
    });
    expect(errorCodes(b)).toContain("NON_FACTUAL_WITH_CLAIMS");
  });
});

describe("script style lint", () => {
  it("flags clichés and invented interiority", () => {
    const found = lintScriptStyle([
      unit("nu-1", "Little did they know, the night would change everything."),
      unit("nu-2", "He must have felt the walls closing in."),
    ]).map((f) => f.code);
    expect(found).toContain("CLICHE_PHRASE");
    expect(found).toContain("INVENTED_INTERIORITY");
  });

  it("flags back-to-back and overused rhetorical questions", () => {
    const units = [
      "Why?",
      "Who?",
      "A statement.",
      "Another.",
      "What then?",
      "Where?",
    ].map((t, i) => unit(`nu-${i}`, t));
    const found = lintScriptStyle(units).map((f) => f.code);
    expect(found).toContain("CONSECUTIVE_QUESTIONS");
    expect(found).toContain("QUESTION_DENSITY");
  });

  it("flags specifics hiding in NON_FACTUAL units", () => {
    expect(
      lintScriptStyle([unit("nu-1", "By 1955 it was over.")]).map(
        (f) => f.code,
      ),
    ).toContain("NON_FACTUAL_CONTAINS_SPECIFICS");
  });
});

describe("duration estimate", () => {
  it("counts years as spoken words", () => {
    expect(spokenWordCount("In 1954 he left")).toBe(6);
  });

  it("adds sentence pauses and explicit pauses", () => {
    const base = estimateUnitDurationSec(
      unit("nu-1", "one two three four five"),
      150,
    );
    expect(base).toBeCloseTo(2, 5);
    const withPause = estimateUnitDurationSec(
      { ...unit("nu-1", "one two three four five."), pauseAfterSec: 1 },
      150,
    );
    expect(withPause).toBeCloseTo(2 + 0.35 + 1, 5);
  });
});
