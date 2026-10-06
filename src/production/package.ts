import type { CaseWorkspace, ProductionManifest, StoryPlan } from "../domain";

export type Chapter = { startSec: number; title: string };

/** YouTube's published chapter rules (support.google.com/youtube/answer/9884579). */
export const YOUTUBE_CHAPTER_RULES = {
  minChapters: 3,
  minChapterSec: 10,
} as const;

/**
 * Chapters from story sequences, timed from the manifest (and therefore from
 * measured narration). A chapter starts where its sequence's first shot
 * starts. Sequences shorter than YouTube's 10 s minimum are merged into the
 * previous chapter rather than dropped silently.
 */
export const buildChapters = (
  story: StoryPlan,
  manifest: ProductionManifest,
): Chapter[] => {
  const fps = manifest.render.fps;
  const totalSec = manifest.render.durationInFrames / fps;
  const raw: Chapter[] = [];
  for (const seq of story.sequences) {
    const first = manifest.shots.find((s) => s.sequenceId === seq.id);
    if (first) raw.push({ startSec: first.startFrame / fps, title: seq.title });
  }
  raw.sort((a, b) => a.startSec - b.startSec);
  if (raw.length) raw[0] = { ...raw[0], startSec: 0 };

  const merged: Chapter[] = [];
  raw.forEach((c, i) => {
    const end = raw[i + 1]?.startSec ?? totalSec;
    if (end - c.startSec < YOUTUBE_CHAPTER_RULES.minChapterSec && merged.length)
      return;
    merged.push(c);
  });
  return merged;
};

export const formatTimestamp = (sec: number) => {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
};

export const chaptersText = (chapters: Chapter[]) =>
  `${chapters.map((c) => `${formatTimestamp(c.startSec)} ${c.title}`).join("\n")}\n`;

/** Problems with a chapter list under YouTube's rules. Empty = valid. */
export const chapterProblems = (
  chapters: Chapter[],
  totalSec: number,
): string[] => {
  const problems: string[] = [];
  if (chapters.length < YOUTUBE_CHAPTER_RULES.minChapters)
    problems.push(
      `needs ≥${YOUTUBE_CHAPTER_RULES.minChapters} chapters, has ${chapters.length}`,
    );
  if (chapters[0] && chapters[0].startSec !== 0)
    problems.push("first chapter must start at 0:00");
  chapters.forEach((c, i) => {
    const end = chapters[i + 1]?.startSec ?? totalSec;
    if (i > 0 && c.startSec <= chapters[i - 1].startSec)
      problems.push(`chapter "${c.title}" is not in ascending order`);
    if (end - c.startSec < YOUTUBE_CHAPTER_RULES.minChapterSec)
      problems.push(
        `chapter "${c.title}" is shorter than ${YOUTUBE_CHAPTER_RULES.minChapterSec}s`,
      );
  });
  return problems;
};

/**
 * Credits for the description / credits.txt: every credit-required asset
 * used in the render, plus the sources cited on screen.
 */
export const buildCredits = (
  ws: CaseWorkspace,
): {
  credits: string[];
  sourceNotes: { sourceId: string; citation: string }[];
} => {
  const used = new Set(ws.manifest?.assets.map((a) => a.assetId) ?? []);
  const credits = (ws.assets?.assets ?? [])
    .filter((a) => used.has(a.id) && a.creditRequired && a.creditText)
    .map((a) => a.creditText!);
  const cited = new Set(
    (ws.visualPlan?.shots ?? []).flatMap((s) => s.citationSourceIds),
  );
  const sourceNotes = ws.sources.sources
    .filter((s) => cited.has(s.id))
    .map((s) => ({
      sourceId: s.id,
      citation: [s.title, s.publisher, s.publicationDate, s.recordIdentifier]
        .filter(Boolean)
        .join(", "),
    }));
  return { credits, sourceNotes };
};

export const creditsText = (ws: CaseWorkspace) => {
  const { credits, sourceNotes } = buildCredits(ws);
  const lines = [
    "CREDITS",
    ...(credits.length ? credits : ["(no credit-required assets)"]),
    "",
    "SOURCES CITED ON SCREEN",
    ...sourceNotes.map((s) => s.citation),
  ];
  return `${lines.join("\n")}\n`;
};
