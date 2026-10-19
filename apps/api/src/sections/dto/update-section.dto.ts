import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';
import { IsOptionalButNotNull, Trim } from '../../common/validation';

// Rename or reorder a column. Moving a section to another list isn't
// supported: its tasks would end up in the wrong list.
export class UpdateSectionDto {
  @IsOptionalButNotNull()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptionalButNotNull()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  position?: number;
}
