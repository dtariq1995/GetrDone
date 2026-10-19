import type { CookieOptions } from 'express';

export const AUTH_COOKIE = 'access_token';

// How long a login lasts. Used for both the JWT expiry and the cookie maxAge
// so the two always agree.
export const SESSION_SECONDS = 7 * 24 * 60 * 60;

// httpOnly: page JavaScript can't read the token, so an XSS bug can't steal it.
// sameSite 'lax': the browser won't send it on cross-site POSTs (CSRF).
// secure: HTTPS-only in production; off locally because dev runs on http.
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}
