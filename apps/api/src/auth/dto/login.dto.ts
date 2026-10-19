import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NormalizeUsername } from './normalize-username';

// Looser than RegisterDto on purpose: a login only needs to be well-formed.
// Whether it is correct is decided by AuthService, with one generic error.
export class LoginDto {
  @NormalizeUsername()
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
