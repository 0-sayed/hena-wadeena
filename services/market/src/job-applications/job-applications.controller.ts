import { CurrentUser } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ApplyJobDto } from './dto/apply-job.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { JobApplicationsService } from './job-applications.service';

@Controller('jobs')
export class JobApplicationsController {
  constructor(private readonly jobApplicationsService: JobApplicationsService) {}

  @Get('my-applications')
  getMyApplications(@CurrentUser() user: JwtPayload, @Query() query: QueryReviewsDto) {
    return this.jobApplicationsService.findMyApplications(user.sub, query);
  }

  @Post(':id/apply')
  apply(
    @Param('id', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApplyJobDto,
  ) {
    return this.jobApplicationsService.apply(jobId, user.sub, dto);
  }

  @Get(':id/applications')
  getApplications(@Param('id', ParseUUIDPipe) jobId: string, @CurrentUser() _user: JwtPayload) {
    return this.jobApplicationsService.findApplicationsForJob(jobId, _user.sub);
  }

  @Patch(':id/applications/:appId')
  updateApplicationStatus(
    @Param('id', ParseUUIDPipe) jobId: string,
    @Param('appId', ParseUUIDPipe) appId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.jobApplicationsService.updateApplicationStatus(jobId, appId, user.sub, dto);
  }

  @Delete(':id/applications/:appId')
  @HttpCode(HttpStatus.NO_CONTENT)
  withdraw(
    @Param('id', ParseUUIDPipe) jobId: string,
    @Param('appId', ParseUUIDPipe) appId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobApplicationsService.withdrawApplication(jobId, appId, user.sub);
  }

  @Post(':id/applications/:appId/reviews')
  submitReview(
    @Param('id', ParseUUIDPipe) jobId: string,
    @Param('appId', ParseUUIDPipe) appId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReviewDto,
  ) {
    return this.jobApplicationsService.submitReview(jobId, appId, user.sub, dto);
  }
}
