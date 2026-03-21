import { CurrentUser, Public, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { BusinessDirectoryService } from './business-directory.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { QueryBusinessesDto } from './dto/query-businesses.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { VerifyBusinessDto } from './dto/verify-business.dto';

@Controller('businesses')
export class BusinessDirectoryController {
  constructor(private readonly service: BusinessDirectoryService) {}

  // Static paths MUST come before /:id

  @Get('mine')
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR)
  findMine(@CurrentUser() user: JwtPayload) {
    return this.service.findMine(user.sub);
  }

  @Get('pending')
  @Roles(UserRole.ADMIN)
  findPending(@Query() query: QueryBusinessesDto) {
    return this.service.findPending(query);
  }

  @Get()
  @Public()
  findAll(@Query() query: QueryBusinessesDto) {
    return this.service.findAll(query);
  }

  @Post()
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR)
  create(@Body() dto: CreateBusinessDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Get(':id')
  @Public()
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/verify')
  @Roles(UserRole.ADMIN)
  verify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyBusinessDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.verify(id, dto, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBusinessDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user.sub, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user.sub, user.role);
  }
}
