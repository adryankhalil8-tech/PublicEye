/**
 * Write the mechanical publishing deliverables from the timed workspace:
 *
 *   output/captions.srt    editable captions (from alignment word timings)
 *   output/captions.ass    styled editable captions
 *   output/chapters.txt    YouTube chapters (from story sequences × manifest timing)
 *   output/credits.txt     required credits + on-screen sources
 *
 *   npm run deliverables -- <case>
 *
 * Title/description/thumbnail drafting is editorial work for the
 * youtube-package skill; this script never writes those.
 */
import path from "node:path";
import { OUTPUT_FILES } from "../src/domain";
import { toAss, toSrt } from "../src/production/captions";
import {
  buildChapters,
  chapterProblems,
  chaptersText,
  creditsText,
} from "../src/production/package";
import { loadWorkspace, resolveCaseDir, writeText } from "./lib/workspace-fs";

const target = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!target) {
  console.error("usage: npm run deliverables -- <case>");
  process.exit(2);
}
const dir = resolveCaseDir(target);
const { workspace: ws } = loadWorkspace(dir);
if (!ws?.alignment || !ws.manifest || !ws.story) {
  console.error("Needs alignment, manifest, and story plan.");
  process.exit(1);
}
if (ws.alignment.alignmentSource === "ESTIMATED") {
  console.warn(
    "WARNING: alignment is ESTIMATED — captions are for preview only.",
  );
}

writeText(path.join(dir, OUTPUT_FILES.srt), toSrt(ws.alignment));
writeText(
  path.join(dir, OUTPUT_FILES.ass),
  toAss(ws.alignment, {
    maxChars: 42,
    maxDurationMs: 3500,
    title: ws.project.title,
  }),
);
const chapters = buildChapters(ws.story, ws.manifest);
writeText(path.join(dir, OUTPUT_FILES.chapters), chaptersText(chapters));
writeText(path.join(dir, OUTPUT_FILES.credits), creditsText(ws));

const problems = chapterProblems(
  chapters,
  ws.manifest.render.durationInFrames / ws.manifest.render.fps,
);
console.log(
  `Wrote captions.srt, captions.ass, chapters.txt (${chapters.length}), credits.txt`,
);
if (problems.length) console.warn(`Chapter problems: ${problems.join("; ")}`);
