import { CurrentUser, Public, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ApplyJobDto } from './dto/apply-job.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { CreateJobReviewDto } from './dto/create-job-review.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import { JobsService } from './jobs.service';

@Controller()
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobsService: JobsService) {}

  @Get('jobs')
  @Public()
  findAll(@Query() query: QueryJobsDto) {
    return this.jobsService.findAll(query);
  }

  @Get('jobs/my-posts')
  @Roles(UserRole.MERCHANT, UserRole.FARMER, UserRole.ADMIN)
  findMyPosts(@CurrentUser() user: JwtPayload) {
    return this.jobsService.findMyPosts(user.sub);
  }

  @Get('jobs/my-applications')
  findMyApplications(@CurrentUser() user: JwtPayload) {
    return this.jobsService.findMyApplications(user.sub);
  }

  @Get('jobs/:id/applications')
  @Roles(UserRole.MERCHANT, UserRole.FARMER, UserRole.ADMIN)
  findApplications(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.jobsService.findApplications(id, user.sub, user.role);
  }

  @Get('jobs/:id')
  @Public()
  async findById(@Param('id') id: string) {
    const job = await this.jobsService.findById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  @Post('jobs')
  @Roles(UserRole.MERCHANT, UserRole.FARMER, UserRole.ADMIN)
  create(@Body() dto: CreateJobDto, @CurrentUser() user: JwtPayload) {
    return this.jobsService.create(dto, user.sub);
  }

  @Post('jobs/:id/apply')
  apply(@Param('id') id: string, @Body() dto: ApplyJobDto, @CurrentUser() user: JwtPayload) {
    return this.jobsService.apply(id, user.sub, dto);
  }

  @Patch('jobs/:jobId/applications/:appId')
  @Roles(UserRole.MERCHANT, UserRole.FARMER, UserRole.ADMIN)
  updateApplicationStatus(
    @Param('jobId') jobId: string,
    @Param('appId') appId: string,
    @Body() dto: UpdateJobApplicationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobsService.updateApplicationStatus(jobId, appId, user.sub, dto, user.role);
  }

  @Delete('jobs/:jobId/applications/:appId')
  withdrawApplication(
    @Param('jobId') jobId: string,
    @Param('appId') appId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobsService.withdrawApplication(jobId, appId, user.sub);
  }

  @Post('jobs/:jobId/applications/:appId/reviews')
  submitReview(
    @Param('jobId') jobId: string,
    @Param('appId') appId: string,
    @Body() dto: CreateJobReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobsService.submitReview(jobId, appId, user.sub, dto);
  }

  @Get('users/:id/job-reviews')
  @Public()
  findUserReviews(@Param('id') id: string) {
    return this.jobsService.findUserReviews(id);
  }
}
