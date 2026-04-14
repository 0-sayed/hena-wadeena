import { Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Param, Query } from '@nestjs/common';

import { QueryNewsDto } from './dto/query-news.dto';
import { NewsService } from './news.service';

@Public()
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  findAll(@Query() query: QueryNewsDto) {
    return this.newsService.findAll(query);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.newsService.findBySlug(slug);
  }
}
