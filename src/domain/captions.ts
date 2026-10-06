import type { Caption } from "@remotion/captions";
import { z } from "zod";

/**
 * Mirrors Remotion's official `Caption` type so timings can be passed
 * straight to @remotion/captions (createTikTokStyleCaptions, serializeSrt…).
 *
 * Word timings live in NarrationAlignment.words (src/domain/narration.ts);
 * there is no separate caption-track artifact. Caption *files* (SRT/ASS) are
 * outputs derived from the alignment — see src/production/captions.ts.
 */
export const captionSchema = z.object({
  text: z.string(),
  startMs: z.number().min(0),
  endMs: z.number().min(0),
  timestampMs: z.number().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
});
export type CaptionEntry = z.infer<typeof captionSchema>;

// Compile-time guarantee that our schema stays assignable to Remotion's type.
const _captionCompat = (c: CaptionEntry): Caption => c;
void _captionCompat;
