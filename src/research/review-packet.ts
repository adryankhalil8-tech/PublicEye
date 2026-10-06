import type { CaseClaim, CaseWorkspace } from "../domain";
import { formatDateSpec } from "../domain";

/**
 * Gate 1 review packet: everything a human needs to approve research, in
 * reading order, as Markdown. Pure — the caller supplies excerpt checks
 * (did each quoted excerpt appear verbatim in the snapshot bytes?).
 */
export type ExcerptCheck = "FOUND" | "NOT_FOUND" | "NO_SNAPSHOT" | "NO_EXCERPT";

const normalize = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Does `excerpt` occur in `text`, ignoring whitespace, case and curly quotes? */
export const excerptInText = (excerpt: string, text: string) =>
  normalize(text).includes(normalize(excerpt));

const mark: Record<ExcerptCheck, string> = {
  FOUND: "✅ found in snapshot",
  NOT_FOUND: "❌ NOT found in snapshot",
  NO_SNAPSHOT: "⚠️ source not snapshotted",
  NO_EXCERPT: "— no excerpt recorded",
};

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

export const buildReviewPacket = (
  ws: CaseWorkspace,
  excerptChecks: Map<string, ExcerptCheck>,
  generatedAt: string,
): string => {
  const src = new Map(ws.sources.sources.map((s) => [s.id, s]));
  const claims = ws.claims.claims;
  const by = (f: (c: CaseClaim) => boolean) => claims.filter(f);
  const lines: string[] = [];
  const p = (...l: string[]) => lines.push(...l);

  p(`# Gate 1 review packet — ${ws.project.title}`, "");
  p(`Generated ${generatedAt}. Review against the snapshots, then decide with`);
  p(
    '`npm run gate -- approve|changes|reject <case> <gate-id> --by="human:<you>"`.',
    "",
  );
  if (ws.project.isSynthetic)
    p("> **SYNTHETIC FIXTURE — fictional case.**", "");

  const counts = (s: string) => claims.filter((c) => c.status === s).length;
  p("## At a glance", "");
  p(
    `- Sources: ${ws.sources.sources.length} (${ws.sources.sources.filter((s) => s.snapshot).length} snapshotted)`,
  );
  p(
    `- Claims: ${claims.length} — SUPPORTED ${counts("SUPPORTED")}, DISPUTED ${counts("DISPUTED")}, CONTRADICTED ${counts("CONTRADICTED")}, INSUFFICIENT ${counts("INSUFFICIENT_EVIDENCE")}, UNVERIFIED ${counts("UNVERIFIED")}`,
  );
  const checks = [...excerptChecks.values()];
  p(
    `- Excerpts checked against snapshots: ${checks.filter((c) => c === "FOUND").length} found, ${checks.filter((c) => c === "NOT_FOUND").length} NOT found, ${checks.filter((c) => c === "NO_SNAPSHOT").length} unsnapshotted`,
  );
  p(
    `- Sensitivity: ${ws.research.sensitivityFlags.join(", ") || "none flagged"}`,
    "",
  );

  p("## 1. Legal status of every named person", "");
  const people = ws.entities.people.filter((x) => x.legalStatuses.length);
  if (!people.length) p("_No legal statuses recorded._");
  for (const person of people) {
    p(
      `- **${person.name}** — ${person.legalStatuses.map((l) => `${l.status}${l.asOf ? ` (${formatDateSpec(l.asOf)})` : ""}: ${l.matter}`).join(" → ")}`,
    );
  }
  p("", "Check: is the LAST status each person's current, final standing?", "");

  const claimTable = (title: string, list: CaseClaim[]) => {
    p(`## ${title}`, "");
    if (!list.length) return p("_None._", "");
    for (const c of list) {
      const a = c.assertion;
      const kind =
        a.type === "ATTRIBUTED"
          ? `ATTRIBUTED (${a.attributedTo} ${a.verb.toLowerCase()})`
          : a.type === "LEGAL_STATUS"
            ? `LEGAL_STATUS ${a.legalStatus}`
            : a.type;
      p(`### \`${c.id}\` · ${c.status} · ${kind}`, "", `> ${c.text}`, "");
      for (const e of c.evidence) {
        const s = src.get(e.reference.sourceId);
        const r = e.reference;
        const loc = [
          r.page && `p. ${r.page}`,
          r.section,
          r.paragraph && `¶${r.paragraph}`,
          r.docketEntry && `dkt ${r.docketEntry}`,
          r.timestamp,
        ]
          .filter(Boolean)
          .join(", ");
        p(
          `- **${e.stance}** — ${s ? `${s.title} (${s.authorityLevel})` : e.reference.sourceId}${loc ? ` · ${loc}` : ""} · ${mark[excerptChecks.get(e.id) ?? "NO_EXCERPT"]}`,
        );
        if (r.excerpt) p(`  - “${esc(r.excerpt)}”`);
      }
      if (c.notes) p(`- _Note:_ ${c.notes}`);
      p("");
    }
  };

  claimTable(
    "2. CORE claims",
    by((c) => c.importance === "CORE"),
  );
  claimTable(
    "3. Allegations and attributed statements",
    by((c) => c.importance !== "CORE" && c.assertion.type === "ATTRIBUTED"),
  );
  claimTable(
    "4. Disputed, contradicted, or insufficient claims",
    by(
      (c) =>
        c.importance !== "CORE" &&
        c.assertion.type !== "ATTRIBUTED" &&
        ["DISPUTED", "CONTRADICTED", "INSUFFICIENT_EVIDENCE"].includes(
          c.status,
        ),
    ),
  );

  p("## 5. Contradictions", "");
  if (!ws.research.contradictions.length) p("_None recorded._");
  for (const x of ws.research.contradictions)
    p(
      `- **${x.id}**: ${x.description}${x.resolution ? ` — _Resolution:_ ${x.resolution}` : " — **unresolved**"}`,
    );
  p("", "## 6. Timeline and gaps", "");
  for (const e of ws.timeline.events)
    p(`- ${formatDateSpec(e.when)} — ${e.description} _(${e.certainty})_`);
  for (const g of ws.timeline.gaps) p(`- ⟂ GAP: ${g.description}`);
  p("", "## 7. Open questions", "");
  for (const q of ws.research.openQuestions) p(`- [${q.status}] ${q.question}`);
  if (!ws.research.openQuestions.length) p("_None._");

  const unsnapshotted = ws.sources.sources.filter(
    (s) => !s.snapshot && s.authorityLevel !== "DISCOVERY_ONLY",
  );
  p("", "## 8. Sources", "");
  for (const s of ws.sources.sources) {
    p(
      `- \`${s.id}\` ${s.authorityLevel} · ${s.title} — ${s.publisher}${s.snapshot ? ` · snapshot sha256:${s.snapshot.sha256.slice(0, 12)}…` : " · **no snapshot**"}`,
    );
    p(`  - ${s.url}${s.archivedUrl ? ` · archive: ${s.archivedUrl}` : ""}`);
  }
  if (unsnapshotted.length)
    p("", `**${unsnapshotted.length} citable source(s) have no snapshot.**`);

  p("", "## Gate 1 checklist", "");
  p("- [ ] Every CORE claim matches its excerpt as read in the source");
  p("- [ ] Allegations are attributed, never stated as fact");
  p("- [ ] Every person's legal status is correct and current");
  p("- [ ] Contradictions are documented, not silently resolved");
  p("- [ ] Timeline gaps and uncertain dates are understood");
  p(
    "- [ ] Sensitivity (minors, living private individuals, victims' families) considered",
  );
  return `${lines.join("\n")}\n`;
};
