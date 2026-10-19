import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Task } from '../generated/prisma/client';
import { ListsService } from '../lists/lists.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  buildCountWheres,
  buildTaskOrderBy,
  buildTaskWhere,
} from './task-query';

// The fields sent to the client. Each task carries its subtasks, which is
// all the list rows ("2/3") and the detail panel's checklist need.
const taskSelect = {
  id: true,
  listId: true,
  parentId: true,
  title: true,
  notes: true,
  dueAt: true,
  isAllDay: true,
  priority: true,
  completedAt: true,
  position: true,
  createdAt: true,
  updatedAt: true,
  subtasks: {
    select: { id: true, title: true, completedAt: true, position: true },
    orderBy: { position: 'asc' },
  },
} satisfies Prisma.TaskSelect;

export type TaskResponse = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

export type TaskCounts = { inbox: number; today: number; next7: number };

// Every method takes the logged-in user's id and puts it in the WHERE clause,
// so one user can never read or change another user's tasks.
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lists: ListsService,
  ) {}

  async findMany(
    userId: string,
    query: ListTasksQueryDto,
  ): Promise<TaskResponse[]> {
    if (query.view === 'list' && query.listId) {
      // Asking for someone else's list is a 404, not an empty result.
      await this.lists.findOwnedOrThrow(userId, query.listId);
    }
    return this.prisma.task.findMany({
      where: buildTaskWhere(userId, query, new Date()),
      orderBy: buildTaskOrderBy(query),
      select: taskSelect,
    });
  }

  async counts(userId: string, tz: string): Promise<TaskCounts> {
    const wheres = buildCountWheres(userId, tz, new Date());
    const [inbox, today, next7] = await Promise.all([
      this.prisma.task.count({ where: wheres.inbox }),
      this.prisma.task.count({ where: wheres.today }),
      this.prisma.task.count({ where: wheres.next7 }),
    ]);
    return { inbox, today, next7 };
  }

  async findOne(userId: string, id: string): Promise<TaskResponse> {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
      select: taskSelect,
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async create(userId: string, dto: CreateTaskDto): Promise<TaskResponse> {
    let listId = dto.listId ?? null;
    let position: number;

    if (dto.parentId) {
      const parent = await this.findOwnedOrThrow(userId, dto.parentId);
      if (parent.parentId) {
        throw new BadRequestException('Subtasks can’t have subtasks');
      }
      // A subtask always lives in its parent's list, and is added to the
      // end of the checklist.
      listId = parent.listId;
      position = (await this.lastPosition({ parentId: parent.id })) + 1;
    } else {
      if (listId) {
        await this.lists.findOwnedOrThrow(userId, listId);
      }
      // New tasks go to the top, right under the quick-add box.
      position =
        (await this.firstPosition({ userId, listId, parentId: null })) - 1;
    }

    return this.prisma.task.create({
      data: {
        userId,
        listId,
        parentId: dto.parentId ?? null,
        title: dto.title,
        notes: dto.notes,
        dueAt: dto.dueAt,
        isAllDay: dto.isAllDay,
        priority: dto.priority,
        position,
      },
      select: taskSelect,
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponse> {
    const task = await this.findOwnedOrThrow(userId, id);

    const movingList = dto.listId !== undefined && dto.listId !== task.listId;
    if (movingList) {
      if (task.parentId) {
        throw new BadRequestException(
          'Subtasks move with their parent; move the parent task instead',
        );
      }
      if (dto.listId) {
        await this.lists.findOwnedOrThrow(userId, dto.listId);
      }
    }

    // Keep the original timestamp if it was already done; clear it if not.
    let completedAt: Date | null | undefined;
    if (dto.completed !== undefined) {
      completedAt = dto.completed ? (task.completedAt ?? new Date()) : null;
    }

    // Prisma skips fields that are undefined, so only what was sent changes.
    const updateTask = this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        notes: dto.notes,
        listId: dto.listId,
        dueAt: dto.dueAt,
        isAllDay: dto.isAllDay,
        priority: dto.priority,
        position: dto.position,
        completedAt,
      },
      select: taskSelect,
    });

    if (!movingList) {
      return updateTask;
    }
    // Moving a task carries its subtasks along, in one transaction so the
    // two never disagree.
    const [updated] = await this.prisma.$transaction([
      updateTask,
      this.prisma.task.updateMany({
        where: { parentId: id },
        data: { listId: dto.listId },
      }),
    ]);
    return updated;
  }

  // The database cascades the delete to the task's subtasks.
  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.task.delete({ where: { id } });
  }

  // Same 404 for "doesn't exist" and "belongs to someone else", so the
  // response doesn't reveal that another user's task exists.
  private async findOwnedOrThrow(userId: string, id: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  private async firstPosition(where: Prisma.TaskWhereInput): Promise<number> {
    const first = await this.prisma.task.findFirst({
      where,
      orderBy: { position: 'asc' },
      select: { position: true },
    });
    return first?.position ?? 0;
  }

  private async lastPosition(where: Prisma.TaskWhereInput): Promise<number> {
    const last = await this.prisma.task.findFirst({
      where,
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return last?.position ?? 0;
  }
}
