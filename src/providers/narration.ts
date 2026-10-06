import type { ProviderInfo } from "./policy";

export type NarrationRequest = {
  narrationUnitId: string;
  text: string;
  voiceId?: string;
  /** Destination path relative to assets/ (e.g. "audio/<case>/nu-001.wav"). */
  outputPath: string;
};

export type NarrationResult = {
  narrationUnitId: string;
  audioPath: string;
  /** Measured from the produced file, never estimated. */
  durationSec: number;
  sampleRate: number;
  channels: number;
};

/**
 * Text-to-speech (or human recording) for ONE narration unit at a time, so
 * units can be retried or re-voiced individually after a failure or an edit.
 * Results feed a NarrationArtifact (src/domain/narration.ts).
 *
 * Implemented:
 * - SystemNarrationProvider (Windows SAPI)  LOCAL  scripts/lib/system-tts.ts
 * Planned (none required):
 * - PiperNarrationProvider                  LOCAL  (open-source neural TTS)
 * - LocalRecordingProvider                  LOCAL  (human voice-over files)
 * - ElevenLabsNarrationProvider             PAID   (optional)
 * - OpenAINarrationProvider                 PAID   (optional)
 *
 * PAID providers must pass assertPaidOperationApproved() (src/pipeline/cost.ts)
 * before every request: env opt-in AND a human-approved cost approval.
 */
export interface NarrationProvider {
  readonly info: ProviderInfo;
  isAvailable(): Promise<boolean>;
  synthesize(request: NarrationRequest): Promise<NarrationResult>;
}
