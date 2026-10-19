import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './jwt.strategy';

// Gives a controller the logged-in user's id: `@CurrentUser() userId: string`.
// It comes from the verified token, never from the request body or URL, which
// is what makes per-user scoping trustworthy.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    return (request.user as AuthUser).id;
  },
);
