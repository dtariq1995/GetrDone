import {
  IsIn,
  IsOptional,
  IsString,
  IsTimeZone,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export const TASK_VIEWS = [
  'inbox',
  'today',
  'next7',
  'all',
  'completed',
  'list',
] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export const TASK_SORTS = [
  'manual',
  'due',
  'priority',
  'title',
  'created',
] as const;
export type TaskSort = (typeof TASK_SORTS)[number];

// GET /api/tasks?view=today&tz=America/Chicago&sort=due&q=milk
export class ListTasksQueryDto {
  @IsIn(TASK_VIEWS)
  view: TaskView;

  // Required for view=list, ignored otherwise.
  @ValidateIf((query: ListTasksQueryDto) => query.view === 'list')
  @IsUUID()
  listId?: string;

  // Search text, matched against task titles.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsIn(TASK_SORTS)
  sort: TaskSort = 'manual';

  // The browser's time zone, so "today" means the user's today.
  @IsOptional()
  @IsTimeZone()
  tz: string = 'UTC';
}
