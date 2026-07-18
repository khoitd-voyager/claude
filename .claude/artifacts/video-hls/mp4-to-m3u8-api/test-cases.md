# Test Cases — MP4 → HLS (m3u8) Transcode API

Target: `backend/src/video/video.service.ts` (`VideoService.transcodeToHls`).
Runner: `cd backend && npm run test -- src/video/video.service.spec.ts`

## Happy path
1. **Valid mp4 → HLS output**
   - Given a small valid `.mp4` buffer/file uploaded as `file`.
   - Then service resolves with `{ id, playlistUrl, outputDir }`.
   - And `public/hls/<id>/index.m3u8` exists and at least one `.ts` segment exists.
   - And `playlistUrl === '/hls/<id>/index.m3u8'`.

## Validation / guard-first (must reject BEFORE touching disk or ffmpeg)
2. **Missing file** → throws `BadRequestException`; no `public/hls/*` folder created.
3. **Wrong extension / mimetype** (e.g. `.txt` / `image/png`) → throws
   `BadRequestException`; nothing written to disk.
4. **Empty file (0 bytes)** → throws `BadRequestException`.
5. **Over size limit** (buffer larger than configured max) → throws
   `BadRequestException` before spawning ffmpeg.

## Error handling
6. **Corrupt / non-decodable mp4** → ffmpeg errors; service rejects with a
   500-class error; the temp upload and partial output are cleaned up.

## Isolation
7. **Two uploads** produce two distinct `jobId` folders under `public/hls/`
   (no collision, no overwrite).

> Note: heavy real-transcode cases may be mocked at the ffmpeg boundary in the
> unit spec; case 1 should assert on the ffmpeg command/options and the output
> path wiring. Delete the `.spec.ts` after all cases pass.
