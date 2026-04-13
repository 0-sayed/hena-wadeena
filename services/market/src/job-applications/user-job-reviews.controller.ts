import { Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';

import { QueryReviewsDto } from './dto/query-reviews.dto';
import { JobApplicationsService } from './job-applications.service';

@Controller('users')
export class UserJobReviewsController {
  constructor(private readonly jobApplicationsService: JobApplicationsService) {}

  @Get(':userId/job-reviews')
  @Public()
  getUserReviews(@Param('userId', ParseUUIDPipe) userId: string, @Query() query: QueryReviewsDto) {
    return this.jobApplicationsService.findUserReviews(userId, query);
  }
}
