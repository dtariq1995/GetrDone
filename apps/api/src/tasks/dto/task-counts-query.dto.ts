import { IsOptional, IsTimeZone } from 'class-validator';

// GET /api/tasks/counts?tz=America/Chicago
export class TaskCountsQueryDto {
  @IsOptional()
  @IsTimeZone()
  tz: string = 'UTC';
}
