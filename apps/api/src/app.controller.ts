import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  // Lets Docker, Render and the web app check that the API is up.
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
