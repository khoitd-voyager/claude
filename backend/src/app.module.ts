import { Module } from '@nestjs/common'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { VideoModule } from './video/video.module'

@Module({
  imports: [
    ServeStaticModule.forRoot({ rootPath: join(process.cwd(), 'public') }),
    VideoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
