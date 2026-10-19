import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  // Lets Docker, Render and the web app check that the API is up.
  @Public()
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
