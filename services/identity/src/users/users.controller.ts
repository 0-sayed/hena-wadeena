import { CurrentUser, InternalGuard, Public } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { users } from '../db/schema/index';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeductDto, TopupDto } from './dto/wallet.dto';
import { UsersService } from './users.service';

function toPublicUser({ passwordHash, ...safe }: typeof users.$inferSelect) {
  void passwordHash;
  return safe;
}

@Controller()
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get('auth/me')
  async getMe(@CurrentUser() user: JwtPayload) {
    const profile = await this.usersService.findById(user.sub);
    if (!profile) throw new NotFoundException('User not found');
    return toPublicUser(profile);
  }

  @Patch('auth/me')
  async updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(user.sub, {
      fullName: dto.full_name,
      email: dto.email,
      phone: dto.phone,
      displayName: dto.display_name,
      avatarUrl: dto.avatar_url,
      language: dto.language,
    });
    if (!updated) throw new NotFoundException('User not found');
    return toPublicUser(updated);
  }

  @Get('wallet')
  async getWallet(@CurrentUser() user: JwtPayload) {
    const balance = await this.usersService.getBalance(user.sub);
    return {
      success: true,
      data: {
        id: `wallet-${user.sub}`,
        user_id: user.sub,
        balance,
        currency: 'EGP',
        recent_transactions: [],
      },
    };
  }

  @Post('wallet/topup')
  async topUp(@CurrentUser() user: JwtPayload, @Body() dto: TopupDto) {
    const balance = await this.usersService.topUp(user.sub, dto.amount);
    return { success: true, data: { balance } };
  }

  @Post('wallet/deduct')
  async deduct(@CurrentUser() user: JwtPayload, @Body() dto: DeductDto) {
    const balance = await this.usersService.deduct(user.sub, dto.amount);
    return { success: true, data: { balance } };
  }

  @Public()
  @UseGuards(InternalGuard)
  @Get('internal/users/:id')
  async getInternalUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      full_name: user.fullName,
      display_name: user.displayName,
      avatar_url: user.avatarUrl,
      role: user.role,
    };
  }
}
