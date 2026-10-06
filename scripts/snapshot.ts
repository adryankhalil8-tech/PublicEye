/**
 * Snapshot a case source: save exactly what was read, hash it, record it.
 *
 *   npm run snapshot -- <case> <src-id>                  fetch it (see below)
 *   npm run snapshot -- <case> <src-id> --file=<path>    register a file YOU downloaded
 *   npm run snapshot -- <case> --all                     every source without a snapshot
 *
 * - CourtListener opinion URLs (/opinion/<cluster>/…) are captured via the
 *   API: the cluster plus every sub-opinion's text, as one JSON file.
 * - Other URLs: one targeted GET. Sites that block automated access (e.g.
 *   fbi.gov) → download in a browser and use --file.
 * - Looks up an EXISTING Wayback Machine capture for archivedUrl (read-only).
 *   It never submits pages to the archive.
 *
 * Files go to <case>/snapshots/ (git-ignored); sources.json records path,
 * SHA-256, size, type, method, and time — and that IS committed.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  sourcesFileSchema,
  WORKSPACE_FILES,
  type CaseSource,
  type SourceSnapshot,
} from "../src/domain";
import {
  clGet,
  opinionText,
  type Cluster,
  type Opinion,
} from "./lib/courtlistener";
import {
  flag,
  readRawWorkspace,
  resolveCaseDir,
  writeJson,
} from "./lib/workspace-fs";

const args = process.argv.slice(2);
const [target, srcId] = args.filter((a) => !a.startsWith("--"));
if (!target || (!srcId && flag(args, "all") !== "true")) {
  console.error(
    "usage: npm run snapshot -- <case> <src-id> [--file=path] | --all",
  );
  process.exit(2);
}
const dir = resolveCaseDir(target);
const raw = readRawWorkspace(dir);
const sourcesFile = sourcesFileSchema.parse(raw.sources);
const now = () => new Date().toISOString();
const UA = "PublicEyeYT-research/0.3 (local documentary research tool)";
const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "text/html": "html",
  "application/json": "json",
  "text/plain": "txt",
};

const record = (
  s: CaseSource,
  bytes: Uint8Array,
  contentType: string,
  method: SourceSnapshot["method"],
  retrievedFrom?: string,
): SourceSnapshot => {
  const ext = EXT[contentType.split(";")[0].trim()] ?? "bin";
  const rel = `snapshots/${s.id}.${ext}`;
  mkdirSync(path.join(dir, "snapshots"), { recursive: true });
  writeFileSync(path.join(dir, rel), bytes);
  return {
    localPath: rel,
    sha256: sha256(bytes),
    bytes: bytes.byteLength,
    contentType: contentType.split(";")[0].trim(),
    retrievedAt: now(),
    method,
    retrievedFrom,
  };
};

const courtListenerCluster = (url: string) =>
  url.match(/courtlistener\.com\/opinion\/(\d+)\//)?.[1];

const snapshotOne = async (s: CaseSource): Promise<CaseSource> => {
  const file = flag(args, "file");
  let snap: SourceSnapshot;
  if (file) {
    const abs = path.resolve(file);
    if (!existsSync(abs)) throw new Error(`no such file ${abs}`);
    const bytes = new Uint8Array(readFileSync(abs));
    const ext = path.extname(abs).slice(1).toLowerCase();
    const type =
      Object.entries(EXT).find(([, e]) => e === ext)?.[0] ??
      "application/octet-stream";
    snap = record(
      s,
      bytes,
      type,
      "USER_PROVIDED",
      `local file: ${path.basename(abs)}`,
    );
    copyFileSync(abs, path.join(dir, snap.localPath));
  } else if (/^https?:\/\/(www\.)?loc\.gov\/resource\//.test(s.url)) {
    // Library of Congress newspaper page: capture the page's OCR full text.
    const meta = await fetch(
      `${s.url}${s.url.includes("?") ? "&" : "?"}fo=json`,
      { headers: { "User-Agent": UA } },
    );
    if (!meta.ok)
      throw new Error(`${meta.status} reading LoC metadata for ${s.url}`);
    const j = (await meta.json()) as { resource?: { fulltext_file?: string } };
    const textUrl = j.resource?.fulltext_file;
    if (!textUrl) throw new Error("LoC page has no OCR full text");
    const raw = (await (
      await fetch(textUrl, { headers: { "User-Agent": UA } })
    ).json()) as Record<string, { full_text?: string }>;
    const text = Object.values(raw)[0]?.full_text ?? "";
    if (!text) throw new Error("LoC OCR text was empty");
    snap = record(
      s,
      new TextEncoder().encode(text),
      "text/plain",
      "API",
      textUrl,
    );
  } else if (courtListenerCluster(s.url)) {
    const id = courtListenerCluster(s.url)!;
    const cluster = (await clGet<Cluster>(`clusters/${id}/`)).body;
    const opinions: (Opinion & { text: string })[] = [];
    for (const u of cluster.sub_opinions ?? []) {
      const o = (await clGet<Opinion>(u)).body;
      opinions.push({ ...o, text: opinionText(o) });
    }
    const body = JSON.stringify(
      { capturedFrom: "CourtListener REST API v4", cluster, opinions },
      null,
      2,
    );
    snap = record(
      s,
      new TextEncoder().encode(body),
      "application/json",
      "API",
      `https://www.courtlistener.com/api/rest/v4/clusters/${id}/`,
    );
  } else {
    const res = await fetch(s.url, {
      headers: {
        "User-Agent":
          "PublicEyeYT-research/0.3 (local documentary research tool)",
      },
      redirect: "follow",
    });
    if (!res.ok)
      throw new Error(
        `${res.status} fetching ${s.url} — download it in a browser and use --file`,
      );
    snap = record(
      s,
      new Uint8Array(await res.arrayBuffer()),
      res.headers.get("content-type") ?? "application/octet-stream",
      "FETCHED",
      res.url,
    );
  }

  let archivedUrl = s.archivedUrl;
  if (!archivedUrl && flag(args, "no-wayback") !== "true") {
    try {
      const w = await fetch(
        `https://archive.org/wayback/available?url=${encodeURIComponent(s.url)}`,
      );
      const j = (await w.json()) as {
        archived_snapshots?: {
          closest?: { available?: boolean; url?: string };
        };
      };
      if (
        j.archived_snapshots?.closest?.available &&
        j.archived_snapshots.closest.url
      ) {
        archivedUrl = j.archived_snapshots.closest.url.replace(
          /^http:/,
          "https:",
        );
      }
    } catch {
      /* Wayback lookup is best-effort */
    }
  }
  console.log(
    `✓ ${s.id} ${snap.method} ${snap.bytes} bytes sha256:${snap.sha256.slice(0, 12)}…${archivedUrl && !s.archivedUrl ? " + archivedUrl" : ""}`,
  );
  return { ...s, snapshot: snap, archivedUrl };
};

const targets = srcId
  ? sourcesFile.sources.filter((s) => s.id === srcId)
  : sourcesFile.sources.filter((s) => !s.snapshot);
if (srcId && targets.length === 0) {
  console.error(`no source ${srcId}`);
  process.exit(1);
}
const updated = new Map<string, CaseSource>();
let failures = 0;
for (const s of targets) {
  try {
    updated.set(s.id, await snapshotOne(s));
  } catch (err) {
    failures++;
    console.log(`✗ ${s.id}: ${(err as Error).message}`);
  }
}
writeJson(path.join(dir, WORKSPACE_FILES.sources), {
  ...sourcesFile,
  sources: sourcesFile.sources.map((s) => updated.get(s.id) ?? s),
});
process.exit(failures ? 1 : 0);
