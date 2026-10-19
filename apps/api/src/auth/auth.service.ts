import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Prisma } from '../generated/prisma/client';
import { PublicUser, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<PublicUser> {
    // argon2id with a random salt per hash (argon2 generates and stores it in
    // the hash string). The plain password is never stored.
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    try {
      return await this.users.create(dto.username, passwordHash);
    } catch (error) {
      // P2002 = unique constraint failed. Relying on the database index
      // (instead of checking first, then inserting) also covers two people
      // registering the same name at the same moment.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Username is already taken');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<PublicUser> {
    const user = await this.users.findByUsernameWithHash(dto.username);

    // Same message for "no such user" and "wrong password", so the response
    // doesn't say which half was wrong.
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return { id: user.id, username: user.username, createdAt: user.createdAt };
  }

  // The token only carries the user id ("sub" = subject). Everything else is
  // looked up fresh, so a token never holds stale or sensitive data.
  signToken(userId: string): Promise<string> {
    const payload: JwtPayload = { sub: userId };
    return this.jwt.signAsync(payload);
  }
}
