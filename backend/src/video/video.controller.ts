import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { TranscodeResult, VideoService } from './video.service'

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('transcode')
  @UseInterceptors(FileInterceptor('file'))
  transcode(@UploadedFile() file?: Express.Multer.File): Promise<TranscodeResult> {
    return this.videoService.transcodeToHls(file)
  }
}
