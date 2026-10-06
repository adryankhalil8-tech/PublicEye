/**
 * Build the Gate 1 review packet → <case>/output/review-packet.md
 *
 *   npm run review-packet -- <case>
 *
 * Checks every evidence excerpt against its source's local snapshot text
 * (verbatim, ignoring whitespace/case) so the reviewer sees which quotes are
 * proven by the saved bytes and which are not.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  buildReviewPacket,
  excerptInText,
  type ExcerptCheck,
} from "../src/research/review-packet";
import { stripHtml } from "./lib/courtlistener";
import { loadWorkspace, resolveCaseDir, writeText } from "./lib/workspace-fs";

const target = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!target) {
  console.error("usage: npm run review-packet -- <case>");
  process.exit(2);
}
const dir = resolveCaseDir(target);
const { workspace: ws } = loadWorkspace(dir);
if (!ws) {
  console.error("Workspace failed to parse; run validate:case.");
  process.exit(1);
}

/** Searchable text of a snapshot: API JSON → opinion texts; HTML → stripped; text → as is. */
const snapshotText = (rel: string, type: string): string | null => {
  const file = path.join(dir, rel);
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, "utf8");
  if (type === "application/json") {
    try {
      const j = JSON.parse(raw) as { opinions?: { text?: string }[] };
      if (j.opinions) return j.opinions.map((o) => o.text ?? "").join("\n");
    } catch {
      /* fall through */
    }
  }
  if (type === "text/html") return stripHtml(raw);
  if (type === "application/pdf") return null; // PDF text extraction: not implemented — human check
  return raw;
};

const texts = new Map<string, string | null>();
for (const s of ws.sources.sources)
  texts.set(
    s.id,
    s.snapshot
      ? snapshotText(s.snapshot.localPath, s.snapshot.contentType)
      : null,
  );

const checks = new Map<string, ExcerptCheck>();
for (const c of ws.claims.claims) {
  for (const e of c.evidence) {
    const text = texts.get(e.reference.sourceId);
    if (!e.reference.excerpt) checks.set(e.id, "NO_EXCERPT");
    else if (text == null) checks.set(e.id, "NO_SNAPSHOT");
    else
      checks.set(
        e.id,
        excerptInText(e.reference.excerpt, text) ? "FOUND" : "NOT_FOUND",
      );
  }
}

const out = path.join(dir, "output", "review-packet.md");
writeText(out, buildReviewPacket(ws, checks, new Date().toISOString()));
const notFound = [...checks.values()].filter((c) => c === "NOT_FOUND").length;
console.log(`Wrote ${out}`);
if (notFound)
  console.log(
    `⚠ ${notFound} excerpt(s) NOT found verbatim in their snapshots — review before Gate 1.`,
  );
