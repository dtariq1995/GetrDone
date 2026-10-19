import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsOptionalButNotNull, Trim } from '../../common/validation';

export class CreateTaskDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsOptionalButNotNull()
  @IsString()
  @MaxLength(10_000)
  notes?: string;

  // Left out or null = the Inbox. Ignored for subtasks, which always share
  // their parent's list.
  @IsOptional()
  @IsUUID()
  listId?: string | null;

  // Makes this a subtask of that task.
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  // An ISO 8601 date-time, e.g. "2026-10-20T05:00:00.000Z".
  @IsOptional()
  @IsISO8601({ strict: true })
  dueAt?: string | null;

  @IsOptionalButNotNull()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptionalButNotNull()
  @IsInt()
  @Min(0)
  @Max(3)
  priority?: number;
}
