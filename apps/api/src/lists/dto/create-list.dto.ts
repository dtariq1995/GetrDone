import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/validation';

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export class CreateListDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  // Optional: the server picks one from its palette if it's left out.
  @IsOptional()
  @Matches(HEX_COLOR, { message: 'color must be a hex colour like #6366f1' })
  color?: string;
}
