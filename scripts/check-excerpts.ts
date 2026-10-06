/**
 * Check every evidence excerpt in a case against its source snapshot.
 *   npx tsx scripts/check-excerpts.ts <case>
 * (The review packet does the same check; this prints a compact list.)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { excerptInText } from "../src/research/review-packet";
import { readRawWorkspace, resolveCaseDir } from "./lib/workspace-fs";

const dir = resolveCaseDir(process.argv[2] ?? "");
const raw = readRawWorkspace(dir) as {
  sources: {
    sources: {
      id: string;
      snapshot?: { localPath: string; contentType: string };
    }[];
  };
  claims: {
    claims: {
      id: string;
      evidence: { reference: { sourceId: string; excerpt?: string } }[];
    }[];
  };
};
const text = new Map<string, string>();
for (const s of raw.sources.sources) {
  if (!s.snapshot) continue;
  const body = readFileSync(path.join(dir, s.snapshot.localPath), "utf8");
  text.set(
    s.id,
    s.snapshot.contentType === "application/json"
      ? (JSON.parse(body) as { opinions: { text: string }[] }).opinions
          .map((o) => o.text)
          .join("\n")
      : body,
  );
}
let ok = 0;
let bad = 0;
for (const c of raw.claims.claims) {
  for (const e of c.evidence) {
    const ex = e.reference.excerpt;
    if (!ex) continue;
    const t = text.get(e.reference.sourceId);
    if (t && excerptInText(ex, t)) ok++;
    else {
      bad++;
      console.log(
        `NOT FOUND ${c.id} [${e.reference.sourceId}] :: ${ex.slice(0, 100)}`,
      );
    }
  }
}
console.log(`found ${ok}, not found ${bad}`);
process.exit(bad ? 1 : 0);
