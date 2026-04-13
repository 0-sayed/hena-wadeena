import { Module } from '@nestjs/common';

import { JobPostsController } from './job-posts.controller';
import { JobPostsService } from './job-posts.service';

@Module({
  controllers: [JobPostsController],
  providers: [JobPostsService],
  exports: [JobPostsService],
})
export class JobPostsModule {}
