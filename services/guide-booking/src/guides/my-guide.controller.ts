import { CurrentUser, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Patch, Post } from '@nestjs/common';

import { CreateGuideDto, GuideUploadUrlDto, UpdateGuideDto } from './dto';
import { GuidesService } from './guides.service';

@Roles(UserRole.GUIDE)
@Controller('my/guide-profile')
export class MyGuideController {
  constructor(@Inject(GuidesService) private readonly guidesService: GuidesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateGuideDto, @CurrentUser() user: JwtPayload) {
    return this.guidesService.create(dto, user.sub);
  }

  @Patch()
  update(@Body() dto: UpdateGuideDto, @CurrentUser() user: JwtPayload) {
    return this.guidesService.update(user.sub, dto);
  }

  @Get()
  findMyProfile(@CurrentUser() user: JwtPayload) {
    return this.guidesService.findMyProfile(user.sub);
  }

  @Post('upload-url')
  @HttpCode(HttpStatus.CREATED)
  getUploadUrl(@Body() dto: GuideUploadUrlDto, @CurrentUser() user: JwtPayload) {
    return this.guidesService.getUploadUrl(user.sub, dto);
  }
}
