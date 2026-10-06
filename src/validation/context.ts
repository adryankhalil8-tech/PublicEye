import type {
  AssetRecord,
  AssetRequirement,
  CaseClaim,
  CaseEvent,
  CaseSource,
  CaseWorkspace,
  Location,
  NarrationUnit,
  Organization,
  Person,
  Shot,
  StorySequence,
} from "../domain";
import { WORKSPACE_FILES } from "../domain";
import { IssueCollector } from "./issues";

/** Lookup tables built once per validation run. */
export type ValidationContext = {
  ws: CaseWorkspace;
  c: IssueCollector;
  sources: Map<string, CaseSource>;
  claims: Map<string, CaseClaim>;
  people: Map<string, Person>;
  organizations: Map<string, Organization>;
  locations: Map<string, Location>;
  events: Map<string, CaseEvent>;
  sequences: Map<string, StorySequence>;
  narration: Map<string, NarrationUnit>;
  shots: Map<string, Shot>;
  requirements: Map<string, AssetRequirement>;
  assets: Map<string, AssetRecord>;
};

const index = <T extends { id: string }>(items: T[] | undefined) =>
  new Map((items ?? []).map((i) => [i.id, i]));

export const buildContext = (ws: CaseWorkspace): ValidationContext => ({
  ws,
  c: new IssueCollector(),
  sources: index(ws.sources.sources),
  claims: index(ws.claims.claims),
  people: index(ws.entities.people),
  organizations: index(ws.entities.organizations),
  locations: index(ws.entities.locations),
  events: index(ws.timeline.events),
  sequences: index(ws.story?.sequences),
  narration: index(ws.script?.units),
  shots: index(ws.visualPlan?.shots),
  requirements: index(ws.visualPlan?.assetRequirements),
  assets: index(ws.assets?.assets),
});

export const at = (file: keyof typeof WORKSPACE_FILES, id?: string) =>
  id ? `${WORKSPACE_FILES[file]}#${id}` : WORKSPACE_FILES[file];

/** Report every ID in `ids` that is missing from `table`. */
export const checkRefs = (
  ctx: ValidationContext,
  ids: readonly string[],
  table: Map<string, unknown>,
  what: string,
  path: string,
) => {
  for (const id of ids) {
    if (!table.has(id))
      ctx.c.error(
        `BROKEN_${what.toUpperCase()}_REF`,
        path,
        `references unknown ${what} "${id}"`,
      );
  }
};
