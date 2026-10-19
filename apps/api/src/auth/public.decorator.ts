import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a route (or controller) as reachable without logging in. Everything
// else requires a valid token, because JwtAuthGuard runs on every route.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
