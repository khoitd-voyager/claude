import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200 MB
const HLS_SEGMENT_SECONDS = 10

export interface TranscodeResult {
  id: string
  playlistUrl: string
  outputDir: string
}

@Injectable()
export class VideoService {
  private readonly hlsRoot = join(process.cwd(), 'public', 'hls')

  async transcodeToHls(file?: Express.Multer.File): Promise<TranscodeResult> {
    // 1. Guard-first — reject invalid input BEFORE touching disk or ffmpeg.
    if (!file) throw new BadRequestException('No file uploaded')
    const size = file.size ?? file.buffer?.length ?? 0
    if (!size) throw new BadRequestException('Uploaded file is empty')
    const isMp4 = file.mimetype === 'video/mp4' || /\.mp4$/i.test(file.originalname ?? '')
    if (!isMp4) throw new BadRequestException('Only .mp4 files are supported')
    if (size > MAX_FILE_SIZE) throw new BadRequestException('File exceeds the maximum allowed size')

    // 2. Passed guards — now do the expensive work.
    const id = randomUUID()
    const outputDir = join(this.hlsRoot, id)
    const tmpInput = join(tmpdir(), `${id}.mp4`)

    await fs.mkdir(outputDir, { recursive: true })
    try {
      await fs.writeFile(tmpInput, file.buffer)
      await this.runFfmpeg(tmpInput, outputDir)
    } catch (err) {
      await fs.rm(outputDir, { recursive: true, force: true }).catch(() => undefined)
      throw new InternalServerErrorException('Failed to transcode video to HLS')
    } finally {
      await fs.rm(tmpInput, { force: true }).catch(() => undefined)
    }

    return { id, playlistUrl: `/hls/${id}/index.m3u8`, outputDir }
  }

  private runFfmpeg(inputPath: string, outputDir: string): Promise<void> {
    const playlistPath = join(outputDir, 'index.m3u8')
    const segmentPath = join(outputDir, 'segment_%03d.ts')
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-profile:v baseline',
          '-level 3.0',
          '-start_number 0',
          `-hls_time ${HLS_SEGMENT_SECONDS}`,
          '-hls_list_size 0',
          `-hls_segment_filename ${segmentPath}`,
          '-f hls',
        ])
        .output(playlistPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run()
    })
  }
}
