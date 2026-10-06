# assets/ — media library (Remotion public dir)

`remotion.config.ts` sets this folder as Remotion's public directory, so
`staticFile("images/foo.jpg")` resolves to `assets/images/foo.jpg`.

| Folder       | For                                                        |
| ------------ | ---------------------------------------------------------- |
| `images/`    | Archival photos, portraits, location stills                |
| `video/`     | B-roll and archival footage                                |
| `audio/`     | Narration renders, music, sound effects                    |
| `documents/` | Scans of filings, reports, newspaper pages                 |
| `textures/`  | Paper, grain, and background textures                      |
| `fixtures/`  | Original, project-owned files used by the synthetic fixture |

## Rules

1. **No file without a record.** Every file used in a video must have an
   `AssetRecord` in `data/cases/<case-id>/assets.json` with its source,
   creator, rights status, and approval.
2. **UNKNOWN rights are never approved.** Validation rejects approval of
   `UNKNOWN`, `PERMISSION_REQUIRED`, or `DO_NOT_USE` assets.
3. **Generated or illustrative media is labeled on screen.** See
   `docs/VIDEO_PIPELINE.md#reconstruction-labels`.

Binary media is git-ignored (size and rights). Only `fixtures/` is committed.
