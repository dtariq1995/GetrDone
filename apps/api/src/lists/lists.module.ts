import { Module } from '@nestjs/common';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';

@Module({
  controllers: [ListsController],
  providers: [ListsService],
  // TasksService uses findOwnedOrThrow to check a task's target list.
  exports: [ListsService],
})
export class ListsModule {}
