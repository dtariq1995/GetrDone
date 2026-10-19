import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { PublicUser, UsersService } from '../users/users.service';
import { AUTH_COOKIE, authCookieOptions, SESSION_SECONDS } from './auth-cookie';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  // Registering also logs the user in, so they land straight in the app.
  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const user = await this.auth.register(dto);
    await this.setAuthCookie(res, user.id);
    return user;
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const user = await this.auth.login(dto);
    await this.setAuthCookie(res, user.id);
    return user;
  }

  // Public so it always works, even with an expired token. The JWT itself
  // stays valid until it expires; clearing the cookie is what logs the
  // browser out.
  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(AUTH_COOKIE, authCookieOptions());
  }

  // The web app calls this on load to find out who (if anyone) is logged in.
  @Get('me')
  async me(@CurrentUser() userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      // Valid token for a user that no longer exists.
      throw new UnauthorizedException();
    }
    return user;
  }

  private async setAuthCookie(res: Response, userId: string): Promise<void> {
    const token = await this.auth.signToken(userId);
    res.cookie(AUTH_COOKIE, token, {
      ...authCookieOptions(),
      maxAge: SESSION_SECONDS * 1000,
    });
  }
}
