import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';

// Used when a new list doesn't specify a colour, picked in turn.
const PALETTE = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
];

// The fields sent to the client (userId is left out; it's always the caller).
const listSelect = {
  id: true,
  name: true,
  color: true,
  position: true,
  createdAt: true,
} satisfies Prisma.ListSelect;

export type ListResponse = Prisma.ListGetPayload<{ select: typeof listSelect }>;

// For the sidebar: each list plus its number of unfinished top-level tasks.
export type ListWithCount = ListResponse & { taskCount: number };

// Every method takes the logged-in user's id and puts it in the WHERE clause,
// so one user can never read or change another user's lists.
@Injectable()
export class ListsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<ListWithCount[]> {
    const lists = await this.prisma.list.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      select: {
        ...listSelect,
        _count: {
          select: {
            tasks: { where: { completedAt: null, parentId: null } },
          },
        },
      },
    });
    return lists.map(({ _count, ...list }) => ({
      ...list,
      taskCount: _count.tasks,
    }));
  }

  // The ownership check used everywhere a list id comes from the client.
  // Another user's list gets the same 404 as a list that doesn't exist, so
  // the response doesn't reveal that it exists.
  async findOwnedOrThrow(userId: string, id: string): Promise<ListResponse> {
    const list = await this.prisma.list.findFirst({
      where: { id, userId },
      select: listSelect,
    });
    if (!list) {
      throw new NotFoundException('List not found');
    }
    return list;
  }

  async create(userId: string, dto: CreateListDto): Promise<ListResponse> {
    const [last, count] = await Promise.all([
      this.prisma.list.findFirst({
        where: { userId },
        orderBy: { position: 'desc' },
      }),
      this.prisma.list.count({ where: { userId } }),
    ]);

    return this.prisma.list.create({
      data: {
        userId,
        name: dto.name,
        color: dto.color ?? PALETTE[count % PALETTE.length],
        // New lists go to the bottom of the sidebar.
        position: (last?.position ?? 0) + 1,
      },
      select: listSelect,
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateListDto,
  ): Promise<ListResponse> {
    await this.findOwnedOrThrow(userId, id);
    return this.prisma.list.update({
      where: { id },
      data: { name: dto.name, color: dto.color, position: dto.position },
      select: listSelect,
    });
  }

  // The database cascades the delete to the list's tasks (see schema.prisma).
  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.list.delete({ where: { id } });
  }
}
