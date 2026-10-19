import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { ListsService } from '../lists/lists.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

const sectionSelect = {
  id: true,
  listId: true,
  name: true,
  position: true,
} satisfies Prisma.SectionSelect;

export type SectionResponse = Prisma.SectionGetPayload<{
  select: typeof sectionSelect;
}>;

// Sections don't store a userId. They belong to a list, so every query here
// checks ownership through the list: `list: { userId }`.
@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lists: ListsService,
  ) {}

  async findForList(
    userId: string,
    listId: string,
  ): Promise<SectionResponse[]> {
    await this.lists.findOwnedOrThrow(userId, listId);
    return this.prisma.section.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
      select: sectionSelect,
    });
  }

  // Same 404 for "doesn't exist" and "is in someone else's list".
  async findOwnedOrThrow(userId: string, id: string): Promise<SectionResponse> {
    const section = await this.prisma.section.findFirst({
      where: { id, list: { userId } },
      select: sectionSelect,
    });
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    return section;
  }

  async create(
    userId: string,
    listId: string,
    dto: CreateSectionDto,
  ): Promise<SectionResponse> {
    await this.lists.findOwnedOrThrow(userId, listId);
    const last = await this.prisma.section.findFirst({
      where: { listId },
      orderBy: { position: 'desc' },
    });
    return this.prisma.section.create({
      // New columns go on the right.
      data: { listId, name: dto.name, position: (last?.position ?? 0) + 1 },
      select: sectionSelect,
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateSectionDto,
  ): Promise<SectionResponse> {
    await this.findOwnedOrThrow(userId, id);
    return this.prisma.section.update({
      where: { id },
      data: { name: dto.name, position: dto.position },
      select: sectionSelect,
    });
  }

  // The database sets the section's tasks to sectionId = null, so they move
  // to "No section" rather than being deleted.
  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.section.delete({ where: { id } });
  }
}
