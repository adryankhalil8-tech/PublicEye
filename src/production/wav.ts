/**
 * Minimal PCM WAV reading/writing — enough to MEASURE narration (duration
 * from the header, not an estimate) and to join per-unit takes with exact
 * silences. Uint8Array/DataView only, so it is isomorphic and testable.
 */
export type WavInfo = {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  /** Byte offset and length of the PCM data chunk. */
  dataOffset: number;
  dataLength: number;
  durationSec: number;
};

const ascii = (v: DataView, at: number) =>
  String.fromCharCode(
    v.getUint8(at),
    v.getUint8(at + 1),
    v.getUint8(at + 2),
    v.getUint8(at + 3),
  );

export const readWavInfo = (bytes: Uint8Array): WavInfo => {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.byteLength < 12 ||
    ascii(v, 0) !== "RIFF" ||
    ascii(v, 8) !== "WAVE"
  ) {
    throw new Error("not a RIFF/WAVE file");
  }
  let at = 12;
  let fmt:
    | Omit<WavInfo, "dataOffset" | "dataLength" | "durationSec">
    | undefined;
  while (at + 8 <= bytes.byteLength) {
    const id = ascii(v, at);
    const size = v.getUint32(at + 4, true);
    const body = at + 8;
    if (id === "fmt ") {
      const format = v.getUint16(body, true);
      if (format !== 1 && format !== 0xfffe)
        throw new Error(`unsupported WAV format ${format} (PCM only)`);
      fmt = {
        channels: v.getUint16(body + 2, true),
        sampleRate: v.getUint32(body + 4, true),
        bitsPerSample: v.getUint16(body + 14, true),
      };
    } else if (id === "data") {
      if (!fmt) throw new Error("WAV data chunk before fmt chunk");
      const dataLength = Math.min(size, bytes.byteLength - body);
      const bytesPerSec =
        fmt.sampleRate * fmt.channels * (fmt.bitsPerSample / 8);
      return {
        ...fmt,
        dataOffset: body,
        dataLength,
        durationSec: dataLength / bytesPerSec,
      };
    }
    at = body + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
};

export const wavHeader = (
  sampleRate: number,
  channels: number,
  bitsPerSample: number,
  dataLength: number,
) => {
  const h = new Uint8Array(44);
  const v = new DataView(h.buffer);
  const put = (at: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  put(0, "RIFF");
  v.setUint32(4, 36 + dataLength, true);
  put(8, "WAVE");
  put(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true);
  v.setUint16(32, channels * (bitsPerSample / 8), true);
  v.setUint16(34, bitsPerSample, true);
  put(36, "data");
  v.setUint32(40, dataLength, true);
  return h;
};

export type JoinedTake = { startSec: number; endSec: number };

/**
 * Concatenate takes (all the same PCM format), inserting `silenceAfterSec[i]`
 * of silence after take i. Returns the joined file and where each take's
 * speech sits on the new timeline — exact, because it is arithmetic on
 * sample counts, not a guess.
 */
export const joinWavs = (
  takes: Uint8Array[],
  silenceAfterSec: number[],
): { bytes: Uint8Array; spans: JoinedTake[]; info: WavInfo } => {
  if (takes.length === 0) throw new Error("no takes to join");
  const infos = takes.map(readWavInfo);
  const { sampleRate, channels, bitsPerSample } = infos[0];
  for (const i of infos) {
    if (
      i.sampleRate !== sampleRate ||
      i.channels !== channels ||
      i.bitsPerSample !== bitsPerSample
    ) {
      throw new Error(
        "takes have different WAV formats; synthesize with one fixed format",
      );
    }
  }
  const frameBytes = channels * (bitsPerSample / 8);
  const silenceBytes = silenceAfterSec.map(
    (s) => Math.round(s * sampleRate) * frameBytes,
  );
  const total = infos.reduce(
    (sum, info, i) => sum + info.dataLength + (silenceBytes[i] ?? 0),
    0,
  );
  const out = new Uint8Array(44 + total);
  out.set(wavHeader(sampleRate, channels, bitsPerSample, total), 0);
  const bytesPerSec = sampleRate * frameBytes;
  const spans: JoinedTake[] = [];
  let at = 44;
  takes.forEach((take, i) => {
    const info = infos[i];
    const start = (at - 44) / bytesPerSec;
    out.set(
      take.subarray(info.dataOffset, info.dataOffset + info.dataLength),
      at,
    );
    at += info.dataLength;
    spans.push({ startSec: start, endSec: (at - 44) / bytesPerSec });
    at += silenceBytes[i] ?? 0; // Uint8Array is zero-filled: silence for signed 16-bit PCM
  });
  return { bytes: out, spans, info: readWavInfo(out) };
};
