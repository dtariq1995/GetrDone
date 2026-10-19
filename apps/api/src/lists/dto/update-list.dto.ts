import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsOptionalButNotNull, Trim } from '../../common/validation';
import { HEX_COLOR } from './create-list.dto';

// Every field is optional; only the ones sent are changed.
export class UpdateListDto {
  @IsOptionalButNotNull()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptionalButNotNull()
  @Matches(HEX_COLOR, { message: 'color must be a hex colour like #6366f1' })
  color?: string;

  @IsOptionalButNotNull()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  position?: number;
}
