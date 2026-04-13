import { CurrentUser, Public } from '@hena-wadeena/nest-common';
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

import { CreateJobPostDto } from './dto/create-job-post.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { UpdateJobPostDto } from './dto/update-job-post.dto';
import { JobPostsService } from './job-posts.service';

@Controller('jobs')
export class JobPostsController {
  constructor(private readonly jobPostsService: JobPostsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateJobPostDto) {
    return this.jobPostsService.create(user.sub, dto);
  }

  @Get()
  @Public()
  findAll(@Query() query: QueryJobsDto) {
    return this.jobPostsService.findAll(query);
  }

  @Get('my-posts')
  findMyPosts(@CurrentUser() user: JwtPayload, @Query() query: QueryJobsDto) {
    return this.jobPostsService.findMyPosts(user.sub, query);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobPostsService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateJobPostDto,
  ) {
    return this.jobPostsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.jobPostsService.remove(id, user.sub);
  }
}
