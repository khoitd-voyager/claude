import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot(): string {
    return 'hello'
  }

  @Get('hello')
  getHello(): { message: string } {
    return { message: this.appService.getHello() }
  }

  @Get('items')
  getItems() {
    return this.appService.getItems()
  }
}
