import { Module } from '@nestjs/common';
import { ListsModule } from '../lists/lists.module';
import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';

@Module({
  imports: [ListsModule],
  controllers: [SectionsController],
  providers: [SectionsService],
  // TasksService uses findOwnedOrThrow to check a task's section.
  exports: [SectionsService],
})
export class SectionsModule {}
