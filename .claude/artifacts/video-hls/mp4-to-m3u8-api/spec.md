# MP4 → HLS (m3u8) Transcode API

## Problem Statement

The NestJS backend (`backend/`) has no way to turn an uploaded `.mp4` into a
streamable HLS bundle. We need one API endpoint that accepts a single `.mp4`
file and produces an HLS output folder (`index.m3u8` playlist + `.ts` segments)
inside a `public/` folder on the server, so the result can be served/streamed.

The machine currently has **no `ffmpeg` binary** and the project has **no
ffmpeg dependency**, so transcoding is not possible today.

## Scope

### In Scope
- One `POST` endpoint that receives a single `.mp4` via `multipart/form-data`.
- Validate the upload (present, `.mp4` / `video/mp4`, size limit).
- Transcode to HLS using a **npm-bundled ffmpeg binary** (`fluent-ffmpeg` +
  `@ffmpeg-installer/ffmpeg`) — no system ffmpeg required.
- Write output to `backend/public/hls/<jobId>/index.m3u8` + segment `.ts` files.
- Serve the `public/` folder statically so `index.m3u8` is reachable by URL.
- Return JSON with the job id, playlist URL, and output directory.
- BE test cases (per CLAUDE.md BE Test Loop).

### Out of Scope
- Multi-bitrate / adaptive (ABR) ladders — single rendition only.
- Auth / rate limiting / persistence of jobs in a DB.
- Async job queue / websocket progress — request completes when transcode ends.
- Frontend UI changes (`frontend/`).
- Deleting/cleaning old output folders (retention policy).

## Proposed Solution

Add a `video` feature module to the existing NestJS app (`backend/src/`),
following the current controller/service pattern (`app.controller.ts` /
`app.service.ts`).

- `VideoController` exposes `POST /videos/transcode`, using
  `FileInterceptor('file')` (multer, memory or disk storage) to receive the mp4.
- `VideoService.transcodeToHls(file)`:
  1. **Guard-first**: reject if no file / wrong mimetype-extension / over size
     limit — BEFORE writing anything to disk or spawning ffmpeg.
  2. Generate a `jobId` (uuid/crypto), create `public/hls/<jobId>/`.
  3. Write the incoming mp4 to a temp path.
  4. Run `fluent-ffmpeg` with HLS options
     (`-f hls`, `-hls_time`, `-hls_segment_filename`) → `index.m3u8`.
  5. Resolve on `end`, reject on `error`; clean up the temp mp4.
  6. Return `{ id, playlistUrl: '/hls/<jobId>/index.m3u8', outputDir }`.
- Register `ServeStaticModule` (root = `backend/public`) so the playlist is
  served. Point ffmpeg binary path via `ffmpeg.setFfmpegPath(installer.path)`.

## Technical Context

- Backend: NestJS `^10.3.0`, Express platform, TypeScript `^5.3.3`
  (`backend/package.json`).
- App wiring: `backend/src/app.module.ts` (imports: []),
  `backend/src/main.ts` (CORS to `http://localhost:3000`, port `3001`).
- Existing pattern to copy: `backend/src/app.controller.ts` +
  `backend/src/app.service.ts` (constructor-injected service).
- Prettier `semi: false` — no semicolons. Minimal-diff policy applies to
  `app.module.ts` (only add the new imports).
- New deps required: `@nestjs/platform-express` already present; add
  `fluent-ffmpeg`, `@ffmpeg-installer/ffmpeg`, `@nestjs/serve-static`, and dev
  types `@types/fluent-ffmpeg`, `@types/multer`.

## Affected Files
- `backend/src/app.module.ts` — register `VideoModule` + `ServeStaticModule` (minimal edit).
- `backend/src/video/video.module.ts` — NEW.
- `backend/src/video/video.controller.ts` — NEW (`POST /videos/transcode`).
- `backend/src/video/video.service.ts` — NEW (ffmpeg HLS logic, guard-first).
- `backend/package.json` — NEW deps.
- `backend/public/.gitkeep` — NEW (ensure output root exists).
- `.claude/artifacts/video-hls/mp4-to-m3u8-api/test-cases.md` — test cases.

## Tasks

### [BE][deps] Add ffmpeg + upload + static-serving dependencies
End state: `backend/package.json` includes `fluent-ffmpeg`,
`@ffmpeg-installer/ffmpeg`, `@nestjs/serve-static`, `@types/fluent-ffmpeg`,
`@types/multer`, and they are installed.
- depends_on: []
- parallel: false
- conflicts_with: []
- files: `backend/package.json`
- Verify: `cd backend && node -e "require('@ffmpeg-installer/ffmpeg'); require('fluent-ffmpeg'); console.log('deps ok')"`

### [BE] VideoService — transcode mp4 → HLS (guard-first)
End state: `VideoService.transcodeToHls(file)` validates the file first, then
writes `public/hls/<jobId>/index.m3u8` + `.ts` segments and returns
`{ id, playlistUrl, outputDir }`; throws `BadRequestException` on invalid input.
- depends_on: [deps]
- parallel: false
- conflicts_with: []
- files: `backend/src/video/video.service.ts`
- Verify: `cd backend && npm run test -- src/video/video.service.spec.ts`

### [BE] VideoController — POST /videos/transcode (multipart)
End state: `POST /videos/transcode` accepts field `file` via
`FileInterceptor`, delegates to `VideoService`, returns the JSON result.
- depends_on: [VideoService]
- parallel: false
- conflicts_with: []
- files: `backend/src/video/video.controller.ts`, `backend/src/video/video.module.ts`
- Verify: `cd backend && npx tsc --noEmit`

### [BE] Wire VideoModule + static serving into app
End state: `app.module.ts` imports `VideoModule` and `ServeStaticModule`
(root `backend/public`); `public/` folder exists.
- depends_on: [VideoController]
- parallel: false
- conflicts_with: []
- files: `backend/src/app.module.ts`, `backend/public/.gitkeep`
- Verify: `cd backend && npx tsc --noEmit`

### [BE][test] Run BE test loop and clean up
End state: all cases in `test-cases.md` pass via `.spec.ts`; the temporary
`.spec.ts` is deleted after passing (per CLAUDE.md BE Test Loop).
- depends_on: [VideoService, VideoController]
- parallel: false
- conflicts_with: []
- files: `backend/src/video/video.service.spec.ts`
- Verify: `cd backend && npm run test -- src/video/video.service.spec.ts`

## Success Criteria
- Verify: `cd backend && npx tsc --noEmit` (compiles clean, no semicolons added).
- Verify: `cd backend && npm run test -- src/video/video.service.spec.ts` (all cases pass).
- Verify: uploading a valid `.mp4` to `POST /videos/transcode` creates
  `backend/public/hls/<jobId>/index.m3u8` plus `.ts` segments and returns the
  playlist URL.
- Verify: a non-mp4 / missing file returns HTTP 400 and writes nothing to disk.

## Risks
- ffmpeg binary size / install time from `@ffmpeg-installer/ffmpeg`.
- Large uploads can exhaust memory if multer memoryStorage is used → prefer a
  size limit and/or disk storage.
- Synchronous request may time out on long videos (accepted: out of scope to
  make async).

## Open Questions
- None blocking. Retention/cleanup of old `public/hls/<jobId>` folders is
  deferred (Out of Scope).
