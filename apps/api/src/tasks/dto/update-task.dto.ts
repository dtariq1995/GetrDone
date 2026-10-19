import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsOptionalButNotNull, Trim } from '../../common/validation';

// PATCH /api/tasks/:id. Every field is optional; only the ones sent change.
// One endpoint covers editing, completing, moving and reordering.
// Fields that can be cleared (listId, dueAt) accept null; the rest don't.
export class UpdateTaskDto {
  @IsOptionalButNotNull()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title?: string;

  @IsOptionalButNotNull()
  @IsString()
  @MaxLength(10_000)
  notes?: string;

  // null moves the task to the Inbox.
  @IsOptional()
  @IsUUID()
  listId?: string | null;

  // The Kanban column; must be a section of the task's list. null = none.
  @IsOptional()
  @IsUUID()
  sectionId?: string | null;

  // null removes the due date.
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

  // true/false rather than a timestamp: the server records when it happened.
  @IsOptionalButNotNull()
  @IsBoolean()
  completed?: boolean;

  @IsOptionalButNotNull()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  position?: number;
}
