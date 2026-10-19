import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { ListResponse, ListsService, ListWithCount } from './lists.service';

@Controller('lists')
export class ListsController {
  constructor(private readonly lists: ListsService) {}

  @Get()
  findAll(@CurrentUser() userId: string): Promise<ListWithCount[]> {
    return this.lists.findAll(userId);
  }

  @Post()
  create(
    @CurrentUser() userId: string,
    @Body() dto: CreateListDto,
  ): Promise<ListResponse> {
    return this.lists.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateListDto,
  ): Promise<ListResponse> {
    return this.lists.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.lists.remove(userId, id);
  }
}
