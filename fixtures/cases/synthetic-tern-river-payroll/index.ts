import type { RawWorkspace } from "../../../src/domain";
import assets from "./assets.json";
import project from "./case.json";
import claims from "./claims.json";
import entities from "./entities.json";
import manifest from "./manifest.json";
import alignment from "./narration/alignment.json";
import narration from "./narration/narration.json";
import qaReport from "./output/qa-report.json";
import youtubePackage from "./output/youtube-package.json";
import research from "./research.json";
import script from "./script.json";
import sources from "./sources.json";
import story from "./story-plan.json";
import timeline from "./timeline.json";
import visualBible from "./visual-bible.json";
import visualPlan from "./visual-plan.json";

/**
 * SYNTHETIC TEST FIXTURE — fictional case, fictional people, fictional
 * records. Imported as plain JSON so it works in Node and in the Remotion
 * bundle alike. Run state lives in ./runs/ and is loaded by the CLIs.
 *
 * Narration metadata here was produced for real by `npm run narrate --draft`
 * (Windows SAPI). The WAV files are git-ignored; regenerate them locally.
 */
export const syntheticTernRiverPayroll: RawWorkspace = {
  project,
  sources,
  claims,
  entities,
  timeline,
  research,
  story,
  script,
  narration,
  alignment,
  visualBible,
  visualPlan,
  assets,
  manifest,
  qaReport,
  youtubePackage,
};

export const SYNTHETIC_FIXTURE_DIR =
  "fixtures/cases/synthetic-tern-river-payroll";
