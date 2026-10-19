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
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { SectionResponse, SectionsService } from './sections.service';

// Listing and creating happen under a list (/lists/:listId/sections);
// changing one uses its own id (/sections/:id), as in the plan.
@Controller()
export class SectionsController {
  constructor(private readonly sections: SectionsService) {}

  @Get('lists/:listId/sections')
  findForList(
    @CurrentUser() userId: string,
    @Param('listId') listId: string,
  ): Promise<SectionResponse[]> {
    return this.sections.findForList(userId, listId);
  }

  @Post('lists/:listId/sections')
  create(
    @CurrentUser() userId: string,
    @Param('listId') listId: string,
    @Body() dto: CreateSectionDto,
  ): Promise<SectionResponse> {
    return this.sections.create(userId, listId, dto);
  }

  @Patch('sections/:id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<SectionResponse> {
    return this.sections.update(userId, id, dto);
  }

  @Delete('sections/:id')
  @HttpCode(204)
  remove(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.sections.remove(userId, id);
  }
}
