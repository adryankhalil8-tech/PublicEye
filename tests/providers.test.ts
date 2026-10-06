import { describe, expect, it } from "vitest";
import {
  assertProviderAllowed,
  buildEstimatedAlignment,
  EstimatedAlignmentProvider,
  PaidProviderNotAllowedError,
  selectProvider,
  type ProviderInfo,
} from "../src/providers";
import { narrationAlignmentSchema } from "../src/domain";
import { fixture } from "./helpers";

const info = (
  id: string,
  costTier: ProviderInfo["costTier"],
): ProviderInfo => ({
  id,
  displayName: id,
  costTier,
  requiresNetwork: costTier !== "LOCAL",
  requiresApiKey: costTier === "PAID",
});

describe("provider cost policy", () => {
  it("refuses paid providers by default", () => {
    expect(() => assertProviderAllowed(info("elevenlabs", "PAID"))).toThrow(
      PaidProviderNotAllowedError,
    );
    expect(() => assertProviderAllowed(info("piper", "LOCAL"))).not.toThrow();
  });

  it("allows paid providers only on explicit opt-in", () => {
    expect(() =>
      assertProviderAllowed(info("elevenlabs", "PAID"), { allowPaid: true }),
    ).not.toThrow();
  });

  it("prefers local, then free, and skips paid unless allowed", () => {
    const candidates = [
      info("paid", "PAID"),
      info("limited", "FREE_WITH_LIMITS"),
      info("local", "LOCAL"),
    ].map((i) => ({ info: i }));
    expect(selectProvider(candidates)?.info.id).toBe("local");
    expect(selectProvider([{ info: info("paid", "PAID") }])).toBeUndefined();
  });
});

describe("estimated alignment (drafting only)", () => {
  const ws = fixture();
  const alignment = buildEstimatedAlignment(ws.script!, "2026-09-30T00:00:00Z");

  it("produces a valid alignment marked ESTIMATED", () => {
    expect(narrationAlignmentSchema.safeParse(alignment).success).toBe(true);
    expect(alignment.alignmentSource).toBe("ESTIMATED");
  });

  it("keeps word timings monotonic and inside their segments", () => {
    for (let i = 1; i < alignment.words.length; i++) {
      expect(alignment.words[i].startMs).toBeGreaterThanOrEqual(
        alignment.words[i - 1].startMs,
      );
    }
    expect(alignment.segments).toHaveLength(ws.script!.units.length);
    expect(alignment.words.at(-1)!.endMs).toBeLessThanOrEqual(
      alignment.segments.at(-1)!.endSec * 1000,
    );
  });

  it("preserves the verified script text exactly (words joined by spaces)", () => {
    const joined = alignment.words.map((c) => c.text).join("");
    expect(joined).toBe(ws.script!.units.map((u) => u.text).join(" "));
  });

  it("is exposed through the provider interface as a local, free provider", async () => {
    const provider = new EstimatedAlignmentProvider();
    expect(provider.info.costTier).toBe("LOCAL");
    expect(
      await provider.align({
        script: ws.script!,
        createdAt: "2026-09-30T00:00:00Z",
      }),
    ).toEqual(alignment);
  });
});
