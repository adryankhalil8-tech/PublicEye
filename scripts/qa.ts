/**
 * Automated QA → output/qa-report.json.
 *
 *   npm run qa -- <case> [--render=output/master.mp4]
 *
 * Technical checks probe the render with Remotion's bundled ffprobe and run
 * ffmpeg's silencedetect (both free, local). Visual and editorial checks use
 * the manifest and validation. Checks a machine cannot judge are written as
 * MANUAL_REQUIRED; the report stays INCOMPLETE until a human records them.
 * Exits 1 unless the report is PASS.
 */
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { OUTPUT_FILES, WORKSPACE_FILES } from "../src/domain";
import { buildQaReport, type MediaProbe } from "../src/qa";
import {
  flag,
  loadWorkspace,
  resolveCaseDir,
  ROOT,
  writeJson,
} from "./lib/workspace-fs";

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
if (!target) {
  console.error("usage: npm run qa -- <case> [--render=path]");
  process.exit(2);
}
const dir = resolveCaseDir(target);
const report = loadWorkspace(dir);
if (!report.workspace) {
  console.error("Workspace failed to parse.");
  process.exit(1);
}
const renderRel = flag(args, "render") ?? OUTPUT_FILES.master;
const renderAbs = path.isAbsolute(renderRel)
  ? renderRel
  : path.join(dir, renderRel);

/** Arguments go through a shell (npx on Windows), so quote paths with spaces. */
const q = (p: string) => JSON.stringify(p);

const probe = (file: string): MediaProbe | null => {
  if (!existsSync(file)) return null;
  const r = spawnSync(
    "npx",
    [
      "remotion",
      "ffprobe",
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_streams",
      "-show_format",
      q(file),
    ],
    {
      cwd: ROOT,
      shell: true,
      encoding: "utf8",
    },
  );
  const start = r.stdout.indexOf("{");
  if (r.status !== 0 || start === -1) {
    const tail = (r.stderr || r.stdout)
      .trim()
      .split(/\r?\n/)
      .slice(-3)
      .join(" ");
    throw new Error(`ffprobe failed on ${file}: ${tail}`);
  }
  const json = JSON.parse(r.stdout.slice(start));
  const video = json.streams.find(
    (s: { codec_type: string }) => s.codec_type === "video",
  );
  const audio = json.streams.find(
    (s: { codec_type: string }) => s.codec_type === "audio",
  );
  const [num, den] = String(video.r_frame_rate).split("/").map(Number);
  let silences: MediaProbe["silences"];
  if (audio) {
    const sd = spawnSync(
      "npx",
      [
        "remotion",
        "ffmpeg",
        "-hide_banner",
        "-i",
        q(file),
        "-af",
        "silencedetect=noise=-45dB:d=2",
        "-f",
        "null",
        "-",
      ],
      {
        cwd: ROOT,
        shell: true,
        encoding: "utf8",
      },
    );
    const text = sd.stderr + sd.stdout;
    const starts = [...text.matchAll(/silence_start: ([\d.]+)/g)].map((m) =>
      Number(m[1]),
    );
    const ends = [...text.matchAll(/silence_end: ([\d.]+)/g)].map((m) =>
      Number(m[1]),
    );
    silences = starts.map((s, i) => ({
      startSec: s,
      endSec: ends[i] ?? Number(json.format.duration),
    }));
  }
  return {
    durationSec: Number(json.format.duration),
    width: video.width,
    height: video.height,
    fps: num / (den || 1),
    videoCodec: video.codec_name,
    fileSizeBytes: statSync(file).size,
    hasAudio: !!audio,
    audioDurationSec: audio
      ? Number(audio.duration ?? json.format.duration)
      : undefined,
    silences,
  };
};

const qa = buildQaReport(report.workspace, report.issues, probe(renderAbs), {
  generatedAt: new Date().toISOString(),
  renderPath: path.relative(dir, renderAbs).replace(/\\/g, "/"),
});
writeJson(path.join(dir, WORKSPACE_FILES.qaReport), qa);
for (const c of qa.checks)
  console.log(
    `${c.status.padEnd(16)} ${c.category.padEnd(10)} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`,
  );
console.log(`\nOVERALL: ${qa.overall}`);
process.exit(qa.overall === "PASS" ? 0 : 1);
