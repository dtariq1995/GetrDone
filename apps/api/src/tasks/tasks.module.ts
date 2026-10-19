import { Module } from '@nestjs/common';
import { ListsModule } from '../lists/lists.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [ListsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
