import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { requireEnv } from '../common/env';
import { AUTH_COOKIE } from './auth-cookie';

export type JwtPayload = { sub: string };

// What JwtAuthGuard attaches to req.user once a token checks out.
export type AuthUser = { id: string };

function tokenFromCookie(req: Request): string | null {
  const token: unknown = req.cookies?.[AUTH_COOKIE];
  return typeof token === 'string' ? token : null;
}

// Passport runs this on every protected request: it reads the token from the
// cookie, checks the signature and expiry, and only then calls validate().
// A missing, expired or tampered token never reaches validate() and the
// request gets a 401.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: tokenFromCookie,
      secretOrKey: requireEnv('JWT_SECRET'),
      // Only accept the algorithm we sign with, so a token can't pick a
      // weaker one (or "none") for itself.
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return { id: payload.sub };
  }
}
