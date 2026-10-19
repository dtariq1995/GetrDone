import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client';

// Services check ownership before they write, so these mostly cover races,
// e.g. a task deleted in another tab between the check and the update.
// Without this filter those would surface as 500 errors.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    switch (error.code) {
      case 'P2025': // the record to update or delete no longer exists
        res
          .status(HttpStatus.NOT_FOUND)
          .json({ statusCode: 404, message: 'Not found' });
        return;
      case 'P2002': // a unique constraint failed
        res
          .status(HttpStatus.CONFLICT)
          .json({ statusCode: 409, message: 'Already exists' });
        return;
      default:
        // Anything else is a real bug: let Nest log it and return a 500.
        super.catch(error, host);
    }
  }
}
