import { dateSpecBounds, partialDateBounds } from "../domain";
import { at, checkRefs, type ValidationContext } from "./context";

export const checkTimeline = (ctx: ValidationContext) => {
  const events = ctx.ws.timeline.events;
  const position = new Map(events.map((e, i) => [e.id, i]));

  events.forEach((event, i) => {
    const path = at("timeline", event.id);
    checkRefs(ctx, event.claimIds, ctx.claims, "claim", path);
    checkRefs(ctx, event.personIds, ctx.people, "person", path);
    checkRefs(ctx, event.locationIds, ctx.locations, "location", path);
    checkRefs(ctx, event.sourceIds, ctx.sources, "source", path);

    const claims = event.claimIds
      .map((id) => ctx.claims.get(id))
      .filter((c) => c !== undefined);

    // Certainty may not exceed what the claims establish.
    if (
      event.certainty === "CONFIRMED" &&
      claims.some((c) => c.status !== "SUPPORTED")
    ) {
      ctx.c.error(
        "EVENT_CERTAINTY_OVERSTATED",
        path,
        "CONFIRMED event rests on claims that are not SUPPORTED",
      );
    }
    if (claims.some((c) => c.status === "UNVERIFIED")) {
      ctx.c.warn(
        "EVENT_ON_UNVERIFIED_CLAIM",
        path,
        "event depends on an UNVERIFIED claim",
      );
    }
    if (claims.some((c) => c.status === "CONTRADICTED")) {
      ctx.c.error(
        "EVENT_ON_CONTRADICTED_CLAIM",
        path,
        "event depends on a CONTRADICTED claim",
      );
    }

    // Event sources should come from the claims that justify it.
    const claimSources = new Set(claims.flatMap((c) => c.sourceIds));
    for (const sid of event.sourceIds) {
      if (!claimSources.has(sid)) {
        ctx.c.warn(
          "EVENT_SOURCE_NOT_IN_CLAIMS",
          path,
          `source "${sid}" is not cited by any of the event's claims`,
        );
      }
    }

    // Uncertain dates are legitimate — surface them so no one "tidies" them up.
    const w = event.when;
    if (w.precision === "RANGE") {
      if (partialDateBounds(w.start).min > partialDateBounds(w.end).max) {
        ctx.c.error(
          "INVALID_DATE_RANGE",
          path,
          `range start ${w.start} is after end ${w.end}`,
        );
      }
      ctx.c.info(
        "UNCERTAIN_DATE",
        path,
        `date is a range (${w.start} – ${w.end})`,
      );
    } else if (w.precision === "APPROXIMATE") {
      ctx.c.info(
        "UNCERTAIN_DATE",
        path,
        `date is approximate (${w.qualifier} ${w.date})`,
      );
    } else if (w.precision === "UNKNOWN") {
      ctx.c.info("UNCERTAIN_DATE", path, "date is unknown");
      for (const [rel, ref] of [
        ["after", w.afterEventId],
        ["before", w.beforeEventId],
      ] as const) {
        if (!ref) continue;
        const p = position.get(ref);
        if (p === undefined)
          ctx.c.error(
            "BROKEN_EVENT_REF",
            path,
            `unknown ${rel}EventId "${ref}"`,
          );
        else if ((rel === "after" && p >= i) || (rel === "before" && p <= i)) {
          ctx.c.error(
            "TIMELINE_ORDER",
            path,
            `must come ${rel} "${ref}" but is listed ${p < i ? "after" : "before"} it`,
          );
        }
      }
    } else if (w.date.length === 10) {
      // Day-precise dates should be corroborated by a primary source.
      const hasPrimary = claims.some((c) =>
        c.evidence.some(
          (e) =>
            e.stance === "SUPPORTS" &&
            ctx.sources.get(e.reference.sourceId)?.authorityLevel === "PRIMARY",
        ),
      );
      if (!hasPrimary) {
        ctx.c.warn(
          "DATE_PRECISION_UNCORROBORATED",
          path,
          `day-precise date ${w.date} has no PRIMARY support — consider month/year precision`,
        );
      }
    }
  });

  // Ordering: an earlier-listed event must not be *definitely* later than a
  // later-listed one. Overlapping ranges are fine (order is then editorial).
  for (let i = 0; i < events.length; i++) {
    const a = dateSpecBounds(events[i].when);
    if (!a) continue;
    for (let j = i + 1; j < events.length; j++) {
      const b = dateSpecBounds(events[j].when);
      if (b && a.min > b.max) {
        ctx.c.error(
          "TIMELINE_ORDER",
          at("timeline", events[j].id),
          `listed after "${events[i].id}" but must have happened before it (${b.max} < ${a.min})`,
        );
      }
    }
  }

  for (const gap of ctx.ws.timeline.gaps) {
    const refs = [gap.afterEventId, gap.beforeEventId].filter(
      (x): x is string => !!x,
    );
    checkRefs(ctx, refs, ctx.events, "event", at("timeline", gap.id));
  }
};
