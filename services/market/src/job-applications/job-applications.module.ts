import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { JobPostsModule } from '../job-posts/job-posts.module';

import { JobApplicationsController } from './job-applications.controller';
import { JobApplicationsService } from './job-applications.service';
import { UserJobReviewsController } from './user-job-reviews.controller';

@Module({
  imports: [HttpModule.register({ timeout: 3000, maxRedirects: 0 }), JobPostsModule],
  controllers: [JobApplicationsController, UserJobReviewsController],
  providers: [JobApplicationsService],
})
export class JobApplicationsModule {}
