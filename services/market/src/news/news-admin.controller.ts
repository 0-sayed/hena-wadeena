import { Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CreateNewsArticleDto } from './dto/create-news-article.dto';
import { AdminQueryNewsDto } from './dto/query-news.dto';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { NewsService } from './news.service';

@Roles(UserRole.ADMIN)
@Controller('admin/news')
export class NewsAdminController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  findAll(@Query() query: AdminQueryNewsDto) {
    return this.newsService.adminFindAll(query);
  }

  @Post()
  create(@Body() dto: CreateNewsArticleDto) {
    return this.newsService.create(dto);
  }

  @Post('upload-image')
  uploadImage(@Body() dto: UploadImageDto) {
    return this.newsService.getUploadImageUrl(dto.filename, dto.contentType);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNewsArticleDto) {
    return this.newsService.update(id, dto);
  }

  @Patch(':id/publish')
  togglePublish(@Param('id') id: string) {
    return this.newsService.togglePublish(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
