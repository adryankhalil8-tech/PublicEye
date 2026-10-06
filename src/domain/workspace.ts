import type { AssetsFile } from "./assets";
import type { CaseProject } from "./case-project";
import type { ClaimsFile } from "./claims";
import type { EntitiesFile } from "./entities";
import type { ProductionManifest } from "./manifest";
import type { NarrationAlignment, NarrationArtifact } from "./narration";
import type { QaReport } from "./qa";
import type { ResearchBrief } from "./research";
import type { ScriptDocument } from "./script";
import type { SourcesFile } from "./sources";
import type { StoryPlan } from "./story";
import type { CaseTimeline } from "./timeline";
import type { VisualPlan } from "./visual";
import type { CaseVisualBible } from "./visual-bible";
import type { YouTubePackage } from "./youtube";

/**
 * In-memory view of data/cases/<case-id>/. Research artifacts are required;
 * downstream artifacts appear as the case moves through the pipeline.
 * Run state (runs/*.json) is loaded separately — it describes the process,
 * not the content.
 */
export type CaseWorkspace = {
  project: CaseProject;
  sources: SourcesFile;
  claims: ClaimsFile;
  entities: EntitiesFile;
  timeline: CaseTimeline;
  research: ResearchBrief;
  story?: StoryPlan;
  script?: ScriptDocument;
  narration?: NarrationArtifact;
  alignment?: NarrationAlignment;
  visualBible?: CaseVisualBible;
  visualPlan?: VisualPlan;
  assets?: AssetsFile;
  manifest?: ProductionManifest;
  qaReport?: QaReport;
  youtubePackage?: YouTubePackage;
};

/** Raw (unparsed) JSON for each workspace file, keyed like CaseWorkspace. */
export type RawWorkspace = { [K in keyof CaseWorkspace]?: unknown };
