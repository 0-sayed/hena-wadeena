import { DrizzleModule, S3Module } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

import { NewsAdminController } from './news-admin.controller';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({
  imports: [DrizzleModule, S3Module],
  controllers: [NewsController, NewsAdminController],
  providers: [NewsService],
})
export class NewsModule {}
