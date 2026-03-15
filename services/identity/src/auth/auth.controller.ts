import { CurrentUser, Public } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ConfirmResetDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  RequestResetDto,
} from './dto';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  async register(@Req() req: Request, @Body() dto: RegisterDto) {
    const ip: string | undefined = req.ip;

    const userAgent: string | undefined = req.headers['user-agent'];
    return this.authService.register(dto, { ip, userAgent });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request, @Body() dto: LoginDto) {
    const ip: string | undefined = req.ip;

    const userAgent: string | undefined = req.headers['user-agent'];
    return this.authService.login(dto, { ip, userAgent });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: JwtPayload, @Body() dto: LogoutDto) {
    await this.authService.logout(user, dto.refresh_token);
    return { message: 'Logged out successfully' };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto.current_password, dto.new_password);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @Post('password-reset/request')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestReset(@Body() dto: RequestResetDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { message: 'If the email exists, a reset code has been sent' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmReset(@Body() dto: ConfirmResetDto) {
    return this.authService.confirmPasswordReset(dto.email, dto.otp, dto.new_password);
  }
}
