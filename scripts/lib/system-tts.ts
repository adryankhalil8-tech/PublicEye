import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readWavInfo } from "../../src/production/wav";
import type {
  NarrationProvider,
  NarrationRequest,
  NarrationResult,
} from "../../src/providers/narration";
import type { ProviderInfo } from "../../src/providers/policy";
import { ROOT } from "./workspace-fs";

/**
 * SystemNarrationProvider — Windows SAPI (System.Speech), built into
 * Windows. LOCAL, free, offline. Robotic voice: fine for timing, drafts and
 * the synthetic fixture; use Piper or a human voice-over for publication.
 *
 * Every take is written in one fixed format (22.05 kHz, 16-bit, mono) so
 * takes can be joined exactly.
 */
export class SystemNarrationProvider implements NarrationProvider {
  readonly info: ProviderInfo = {
    id: "system-sapi",
    displayName: "Windows SAPI (System.Speech)",
    costTier: "LOCAL",
    requiresNetwork: false,
    requiresApiKey: false,
  };

  constructor(private readonly voice?: string) {}

  async isAvailable(): Promise<boolean> {
    if (process.platform !== "win32") return false;
    const r = spawnSync(
      "powershell",
      ["-NoProfile", "-Command", "Add-Type -AssemblyName System.Speech"],
      { encoding: "utf8" },
    );
    return r.status === 0;
  }

  async synthesize(req: NarrationRequest): Promise<NarrationResult> {
    const out = path.join(ROOT, "assets", req.outputPath);
    mkdirSync(path.dirname(out), { recursive: true });
    // Text goes through a temp file: no shell quoting of script text, ever.
    const tmp = path.join(
      os.tmpdir(),
      `pe-tts-${req.narrationUnitId}-${process.pid}.txt`,
    );
    writeFileSync(tmp, req.text, "utf8");
    const voice = req.voiceId ?? this.voice;
    const ps = [
      "$ErrorActionPreference = 'Stop'",
      "Add-Type -AssemblyName System.Speech",
      "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
      voice ? `$s.SelectVoice('${voice.replace(/'/g, "''")}')` : "",
      "$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)",
      `$s.SetOutputToWaveFile('${out.replace(/'/g, "''")}', $fmt)`,
      `$s.Speak([IO.File]::ReadAllText('${tmp.replace(/'/g, "''")}'))`,
      "$s.Dispose()",
    ]
      .filter(Boolean)
      .join("; ");
    const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
      encoding: "utf8",
    });
    rmSync(tmp, { force: true });
    if (r.status !== 0)
      throw new Error(
        `SAPI failed: ${(r.stderr || r.stdout).trim().split("\n")[0]}`,
      );
    const info = readWavInfo(new Uint8Array(readFileSync(out)));
    return {
      narrationUnitId: req.narrationUnitId,
      audioPath: req.outputPath,
      durationSec: info.durationSec,
      sampleRate: info.sampleRate,
      channels: info.channels,
    };
  }
}
