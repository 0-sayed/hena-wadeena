import { CurrentUser, type JwtPayload, Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { UsersService } from '../users/users.service';

import { AdminUsersService } from './admin-users.service';
import { ChangeRoleDto, ChangeStatusDto, QueryUsersDto } from './dto';

@Controller('admin/users')
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(AdminUsersService) private readonly adminUsersService: AdminUsersService,
  ) {}

  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsersService.findDetail(id);
  }

  @Patch(':id/role')
  async changeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    if (id === admin.sub) throw new ForbiddenException('Cannot change your own role');
    const { passwordHash, deletedAt, ...safe } = await this.usersService.changeRole(
      id,
      dto.role,
      admin.sub,
    );
    void passwordHash;
    void deletedAt;
    return safe;
  }

  @Patch(':id/status')
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    if (id === admin.sub) throw new ForbiddenException('Cannot change your own status');
    const { passwordHash, deletedAt, ...safe } = await this.usersService.changeStatus(
      id,
      dto.status,
      admin.sub,
      dto.reason,
    );
    void passwordHash;
    void deletedAt;
    return safe;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: JwtPayload) {
    if (id === admin.sub) throw new ForbiddenException('Cannot delete your own account');
    await this.usersService.softDelete(id, admin.sub);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: JwtPayload) {
    if (id === admin.sub) throw new ForbiddenException('Cannot reset your own password here');
    return this.adminUsersService.resetPassword(id, admin.sub);
  }
}
