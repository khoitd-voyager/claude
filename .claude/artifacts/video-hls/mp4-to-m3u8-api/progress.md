# Progress — MP4 → HLS (m3u8) Transcode API

Ship run: 2026-07-18. Repo is NOT a git repository → per-task commits skipped (see handoff note).

| # | Task | Status | Files | Gate |
|---|------|--------|-------|------|
| 1 | deps | [x] | backend/package.json | `node -e "require('@ffmpeg-installer/ffmpeg'); require('fluent-ffmpeg')"` → `deps ok`; ffmpeg 4.4 binary executable |
| 2 | VideoService (guard-first) | [x] | backend/src/video/video.service.ts | covered by BE spec (7/7) |
| 3 | VideoController + module | [x] | backend/src/video/video.controller.ts, video.module.ts | idiomatic Nest; typecheck is user-run per CLAUDE.md |
| 4 | Wire app + static serving | [x] | backend/src/app.module.ts, backend/public/.gitkeep | ServeStaticModule(root=public) + VideoModule imported |
| 5 | BE test loop | [x] | (temp) video.service.spec.ts | `npm run test -- src/video/video.service.spec.ts` → 7 passed; spec deleted after PASS per BE Test Loop |

## Notes / deviations
- Added `esModuleInterop: true` to backend/tsconfig.json (1 line): the service uses default imports of the CommonJS `fluent-ffmpeg` and `@ffmpeg-installer/ffmpeg` packages, which resolve to `undefined` without interop. Strictly-more-permissive; existing named imports unaffected.
- Added jest + ts-jest + @types/jest and a `test` script (deps task) — required for the BE test runner; no test infra existed before.
- BE spec mocked the ffmpeg boundary (per test-cases.md note); asserted `-f hls` option and output playlist path wiring for the happy path; guard cases assert no disk write before rejection; error case asserts output dir cleanup.

## Review (/review-ship 2026-07-18)
- BE test loop re-run: recreated `video.service.spec.ts`, `npm run test` → **7/7 passed**, then deleted the spec (per BE Test Loop). `public/hls` left clean.
- Real ffmpeg smoke (beyond mock): synthesized a 2s mp4 with the bundled binary and ran the service's exact `outputOptions` array → produced `index.m3u8` + `segment_000.ts`. Success criterion #3 (real transcode) verified, not just mocked.
- Verdict: **SHIP**. No Critical/Important bugs; guard-first honored, cleanup paths sound.

### Minor (deferred cleanup, not blocking)
- `video.controller.ts:10` — `FileInterceptor('file')` has no `limits`, so multer (memory storage) buffers the whole upload into RAM before the service's `size > MAX_FILE_SIZE` guard runs; the guard rejects correctly but cannot protect memory. Spec pre-acknowledged this risk. Fix later: pass `limits: { fileSize: MAX_FILE_SIZE }` (note: changes the too-large error contract from 400 → 413, so it's a deliberate decision, not a silent minimal-diff).
- `video.service.ts:42` — `catch (err)` swallows the underlying ffmpeg error into a generic `InternalServerErrorException`; consider logging `err` for prod debuggability.

## Handoff
Implementation done. NOT a git repo, so no commits/PR were created. Run `/review-ship` to review + close.
