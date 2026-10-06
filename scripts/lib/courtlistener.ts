import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  checkBudget,
  COURTLISTENER_BASE,
} from "../../src/providers/courtlistener";
import { ROOT } from "./workspace-fs";

/**
 * Node client for CourtListener v4.
 *
 * - Token from .env (COURTLISTENER_API_TOKEN), sent as "Authorization: Token …".
 *   Never logged.
 * - Every response is cached on disk (data/cache/courtlistener/, git-ignored)
 *   and served from cache forever unless --refresh. Re-running a stage never
 *   spends the daily budget twice.
 * - A persistent ledger of live requests enforces the 5/min, 50/hr, 125/day
 *   limits across runs; minute-limits are waited out, hour/day limits stop.
 */
export const CACHE_DIR = path.join(ROOT, "data", "cache", "courtlistener");
const LEDGER = path.join(CACHE_DIR, "_ledger.json");

export const loadEnv = () => {
  try {
    process.loadEnvFile(path.join(ROOT, ".env"));
  } catch {
    /* no .env — handled where the token is needed */
  }
};

const token = () => {
  loadEnv();
  const t = process.env.COURTLISTENER_API_TOKEN?.trim();
  if (!t)
    throw new Error(
      "COURTLISTENER_API_TOKEN is not set. Put it in .env at the project root (see .env.example).",
    );
  return t;
};

const readLedger = (): number[] =>
  existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, "utf8")) : [];
const writeLedger = (times: number[]) => {
  mkdirSync(CACHE_DIR, { recursive: true });
  const dayAgo = Date.now() - 86_400_000;
  writeFileSync(LEDGER, JSON.stringify(times.filter((t) => t > dayAgo)));
};

export const budgetStatus = () => checkBudget(readLedger(), Date.now());

const cacheFile = (url: string) =>
  path.join(
    CACHE_DIR,
    `${createHash("sha256").update(url).digest("hex").slice(0, 24)}.json`,
  );

export type CachedResponse<T> = {
  url: string;
  fetchedAt: string;
  status: number;
  fromCache: boolean;
  body: T;
};

export const absoluteUrl = (
  pathOrUrl: string,
  params?: Record<string, string | undefined>,
) => {
  const u = new URL(pathOrUrl, COURTLISTENER_BASE);
  if (u.hostname !== "www.courtlistener.com")
    throw new Error(`refusing non-CourtListener URL ${u.hostname}`);
  for (const [k, v] of Object.entries(params ?? {}))
    if (v !== undefined) u.searchParams.set(k, v);
  return u.toString();
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const clGet = async <T>(
  pathOrUrl: string,
  params?: Record<string, string | undefined>,
  opts: { refresh?: boolean } = {},
): Promise<CachedResponse<T>> => {
  const url = absoluteUrl(pathOrUrl, params);
  const file = cacheFile(url);
  if (!opts.refresh && existsSync(file)) {
    const hit = JSON.parse(readFileSync(file, "utf8")) as Omit<
      CachedResponse<T>,
      "fromCache"
    >;
    return { ...hit, fromCache: true };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const decision = checkBudget(readLedger(), Date.now());
    if (!decision.ok) {
      if (!decision.canWait)
        throw new Error(
          `${decision.reason}. Try again in ${Math.ceil(decision.waitMs / 60000)} min.`,
        );
      process.stderr.write(
        `  (rate limit: waiting ${Math.ceil(decision.waitMs / 1000)}s)\n`,
      );
      await sleep(decision.waitMs + 250);
      continue;
    }
    writeLedger([...readLedger(), Date.now()]);
    const res = await fetch(url, {
      headers: {
        Authorization: `Token ${token()}`,
        Accept: "application/json",
        "User-Agent":
          "PublicEyeYT-research/0.3 (local documentary research tool)",
      },
    });
    if (res.status === 429) {
      const retry = Number(res.headers.get("retry-after") ?? "60");
      process.stderr.write(`  (429 from CourtListener: waiting ${retry}s)\n`);
      await sleep(retry * 1000);
      continue;
    }
    if (!res.ok)
      throw new Error(
        `CourtListener ${res.status} for ${url}: ${(await res.text()).slice(0, 200)}`,
      );
    const body = (await res.json()) as T;
    const record = {
      url,
      fetchedAt: new Date().toISOString(),
      status: res.status,
      body,
    };
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(file, JSON.stringify(record));
    return { ...record, fromCache: false };
  }
  throw new Error(
    `CourtListener: gave up after repeated throttling for ${url}`,
  );
};

export type Cluster = {
  id: number;
  case_name?: string;
  case_name_full?: string;
  date_filed?: string;
  judges?: string;
  syllabus?: string;
  posture?: string;
  procedural_history?: string;
  citations?: { volume: number; reporter: string; page: string }[];
  sub_opinions?: string[];
  docket?: string;
  absolute_url?: string;
};
export type Opinion = {
  id: number;
  type?: string;
  author_str?: string;
  plain_text?: string;
  html_with_citations?: string;
  html?: string;
  download_url?: string | null;
  cluster?: string;
};

export const stripHtml = (h: string) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
export const opinionText = (o: Opinion) =>
  o.plain_text?.trim()
    ? o.plain_text
    : stripHtml(o.html_with_citations || o.html || "");
