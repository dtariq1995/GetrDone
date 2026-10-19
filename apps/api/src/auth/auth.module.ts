import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { requireEnv } from '../common/env';
import { UsersModule } from '../users/users.module';
import { SESSION_SECONDS } from './auth-cookie';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // registerAsync so the secret is read when the app starts (after main.ts
    // has loaded .env), not when this file is first imported.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: requireEnv('JWT_SECRET'),
        signOptions: { algorithm: 'HS256', expiresIn: SESSION_SECONDS },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
