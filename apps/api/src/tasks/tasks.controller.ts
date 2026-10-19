import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { TaskCountsQueryDto } from './dto/task-counts-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskCounts, TaskResponse, TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  findMany(
    @CurrentUser() userId: string,
    @Query() query: ListTasksQueryDto,
  ): Promise<TaskResponse[]> {
    return this.tasks.findMany(userId, query);
  }

  // Declared before ':id' so "counts" isn't treated as a task id.
  @Get('counts')
  counts(
    @CurrentUser() userId: string,
    @Query() query: TaskCountsQueryDto,
  ): Promise<TaskCounts> {
    return this.tasks.counts(userId, query.tz);
  }

  @Get(':id')
  findOne(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<TaskResponse> {
    return this.tasks.findOne(userId, id);
  }

  @Post()
  create(
    @CurrentUser() userId: string,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskResponse> {
    return this.tasks.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskResponse> {
    return this.tasks.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.tasks.remove(userId, id);
  }
}
