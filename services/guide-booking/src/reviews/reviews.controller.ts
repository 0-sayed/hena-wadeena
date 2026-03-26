import { CurrentUser, Public, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { CreateReviewDto, QueryReviewsDto, ReplyReviewDto, UpdateReviewDto } from './dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // --- Static paths MUST come before /:id ---

  @Get('mine')
  findMine(@CurrentUser() user: JwtPayload, @Query() query: QueryReviewsDto) {
    return this.reviewsService.findMine(user.sub, query);
  }

  @Post()
  @Roles(UserRole.TOURIST, UserRole.STUDENT, UserRole.INVESTOR, UserRole.RESIDENT, UserRole.DRIVER)
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: JwtPayload) {
    return this.reviewsService.create(dto, user.sub);
  }

  @Get(':id')
  @Public()
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.findById(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reviewsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.reviewsService.remove(id, user.sub, user.role);
  }

  @Post(':id/helpful')
  markHelpful(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.reviewsService.markHelpful(id, user.sub);
  }

  @Post(':id/reply')
  @Roles(UserRole.GUIDE)
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reviewsService.reply(id, dto, user.sub);
  }
}
