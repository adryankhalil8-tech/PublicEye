import { serializeSrt } from "@remotion/captions";
import type { CaptionEntry, NarrationAlignment } from "../domain";

/**
 * Caption mastering. The canonical master video has NO burned-in captions;
 * editable caption files are separate deliverables:
 *
 *   output/master.mp4            canonical, clean
 *   output/captions.srt          editable, universal (YouTube upload)
 *   output/captions.ass          editable, styled
 *   output/master-captioned.mp4  optional derivative (CaseVideo showCaptions)
 *
 * All three caption forms come from NarrationAlignment.words, so they share
 * one timing source with the picture.
 */

export type CaptionLineOptions = {
  maxChars: number;
  maxDurationMs: number;
};

export const DEFAULT_LINE_OPTIONS: CaptionLineOptions = {
  maxChars: 42,
  maxDurationMs: 3500,
};

/**
 * Group words into readable caption lines. Lines never cross a narration
 * segment boundary, so a caption never straddles a pause or a scene change.
 */
export const captionLines = (
  alignment: NarrationAlignment,
  opts: CaptionLineOptions = DEFAULT_LINE_OPTIONS,
): CaptionEntry[][] => {
  const segmentEnds = alignment.segments.map((s) =>
    Math.round(s.endSec * 1000),
  );
  const segmentOf = (ms: number) => {
    const i = segmentEnds.findIndex((end) => ms < end);
    return i === -1 ? segmentEnds.length : i;
  };
  const lines: CaptionEntry[][] = [];
  let line: CaptionEntry[] = [];
  let lineSegment = -1;
  for (const w of alignment.words) {
    const seg = segmentOf(w.startMs);
    const text = line.map((x) => x.text).join("") + w.text;
    const tooLong = text.trim().length > opts.maxChars;
    const tooSlow =
      line.length > 0 && w.endMs - line[0].startMs > opts.maxDurationMs;
    if (line.length && (seg !== lineSegment || tooLong || tooSlow)) {
      lines.push(line);
      line = [];
    }
    if (line.length === 0) lineSegment = seg;
    line.push(line.length === 0 ? { ...w, text: w.text.trimStart() } : w);
  }
  if (line.length) lines.push(line);
  return lines;
};

export const toSrt = (
  alignment: NarrationAlignment,
  opts?: CaptionLineOptions,
): string => `${serializeSrt({ lines: captionLines(alignment, opts) })}\n`;

const assTime = (ms: number) => {
  const cs = Math.round(ms / 10);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
};

const assEscape = (t: string) =>
  t
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\n/g, "\\N");

/**
 * Advanced SubStation Alpha file. Styling mirrors the on-video CaptionLayer
 * (sans, bottom-center, semi-opaque box) so the captioned derivative and a
 * player-rendered .ass look alike.
 */
export const toAss = (
  alignment: NarrationAlignment,
  opts: CaptionLineOptions & { title?: string } = { ...DEFAULT_LINE_OPTIONS },
): string => {
  const header = [
    "[Script Info]",
    `Title: ${opts.title ?? "Narration captions"}`,
    "ScriptType: v4.00+",
    "PlayResX: 1920",
    "PlayResY: 1080",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Default,Arial,40,&H00DAE6EC,&H00DAE6EC,&H00000000,&H4709090A,0,0,0,0,100,100,0,0,3,10,0,2,120,120,72,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const events = captionLines(alignment, opts).map((line) => {
    const start = line[0].startMs;
    const end = line[line.length - 1].endMs;
    const text = line
      .map((w) => w.text)
      .join("")
      .trim();
    return `Dialogue: 0,${assTime(start)},${assTime(end)},Default,,0,0,0,,${assEscape(text)}`;
  });
  return `${[...header, ...events].join("\n")}\n`;
};
