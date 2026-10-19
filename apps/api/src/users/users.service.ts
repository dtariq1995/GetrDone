import { Injectable } from '@nestjs/common';
import { Prisma, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// The fields that are safe to send to a client. passwordHash is deliberately
// left out, so anything returned through this select can't leak it.
const publicUserSelect = {
  id: true,
  username: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Includes passwordHash, so only AuthService uses it, to check a login.
  findByUsernameWithHash(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findById(id: string): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }

  create(username: string, passwordHash: string): Promise<PublicUser> {
    return this.prisma.user.create({
      data: { username, passwordHash },
      select: publicUserSelect,
    });
  }
}
