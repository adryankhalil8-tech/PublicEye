/**
 * CourtListener research CLI (cached; budget-enforced).
 *
 *   npm run cl -- search "<query>" [--after=YYYY-MM-DD] [--before=YYYY-MM-DD] [--court=scotus] [--order=score]
 *   npm run cl -- cluster <cluster-id>
 *   npm run cl -- opinion <opinion-id> [--text]
 *   npm run cl -- budget
 *
 * Add --refresh to bypass the cache (spends budget). Targeted lookups only —
 * this is not a crawler.
 */
import { toCaseLawHit } from "../src/providers/courtlistener";
import {
  budgetStatus,
  clGet,
  opinionText,
  type Cluster,
  type Opinion,
} from "./lib/courtlistener";
import { flag } from "./lib/workspace-fs";

const [cmd, arg, ...rest] = process.argv.slice(2);
const refresh = flag(rest, "refresh") === "true";
const tag = (fromCache: boolean) => (fromCache ? "[cache]" : "[live]");

type SearchBody = {
  count?: number;
  next?: string | null;
  results: Parameters<typeof toCaseLawHit>[0][];
};
try {
  if (cmd === "budget") {
    const b = budgetStatus();
    console.log(
      b.ok
        ? b.remaining.map((r) => `${r.left} left ${r.label}`).join(" · ")
        : b.reason,
    );
  } else if (cmd === "search" && arg) {
    const r = await clGet<SearchBody>(
      "search/",
      {
        q: arg,
        type: flag(rest, "type") ?? "o",
        filed_after: flag(rest, "after"),
        filed_before: flag(rest, "before"),
        court: flag(rest, "court"),
        order_by: flag(rest, "order") ?? "score desc",
      },
      { refresh },
    );
    console.log(
      `${tag(r.fromCache)} ${r.body.count ?? "?"} results for "${arg}"`,
    );
    for (const h of r.body.results.slice(0, 20).map(toCaseLawHit)) {
      console.log(
        `- cluster ${h.clusterId} · ${h.dateFiled} · ${h.court} · ${h.caseName}${h.citations.length ? ` · ${h.citations.join("; ")}` : ""}\n  ${h.url}`,
      );
    }
  } else if (cmd === "cluster" && arg) {
    const r = await clGet<Cluster>(`clusters/${arg}/`, undefined, { refresh });
    const c = r.body;
    console.log(
      `${tag(r.fromCache)} ${c.case_name_full || c.case_name} (${c.date_filed})`,
    );
    console.log(
      `citations: ${(c.citations ?? []).map((x) => `${x.volume} ${x.reporter} ${x.page}`).join("; ") || "—"}`,
    );
    console.log(`judges: ${c.judges || "—"}`);
    console.log(
      `opinions: ${(c.sub_opinions ?? []).map((u) => u.split("/").filter(Boolean).pop()).join(", ")}`,
    );
    if (c.absolute_url)
      console.log(`url: https://www.courtlistener.com${c.absolute_url}`);
  } else if (cmd === "opinion" && arg) {
    const r = await clGet<Opinion>(`opinions/${arg}/`, undefined, { refresh });
    const text = opinionText(r.body);
    console.log(
      `${tag(r.fromCache)} opinion ${r.body.id} · ${r.body.type ?? ""} · ${r.body.author_str || "author n/a"} · ${text.length} chars`,
    );
    console.log(
      flag(rest, "text") === "true"
        ? text
        : `${text.slice(0, 1200)}${text.length > 1200 ? "…" : ""}`,
    );
  } else {
    console.error("usage: npm run cl -- <search|cluster|opinion|budget> …");
    process.exit(2);
  }
} catch (err) {
  console.error(`ERROR: ${(err as Error).message}`);
  process.exit(1);
}
