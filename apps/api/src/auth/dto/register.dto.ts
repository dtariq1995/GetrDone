import { IsString, Length, Matches } from 'class-validator';
import { NormalizeUsername } from './normalize-username';

export class RegisterDto {
  @NormalizeUsername()
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'username can only contain letters, numbers and underscores',
  })
  username: string;

  // The upper limit stops someone sending a huge string to make the server
  // spend time hashing it.
  @IsString()
  @Length(8, 128)
  password: string;
}
