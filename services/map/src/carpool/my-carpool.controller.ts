import { CurrentUser } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CarpoolService } from './carpool.service';
import { CreateRideDto, JoinRideDto } from './dto';

@Controller('carpool')
export class MyCarpoolController {
  constructor(@Inject(CarpoolService) private readonly carpoolService: CarpoolService) {}

  @Get('my')
  myRides(@CurrentUser() user: JwtPayload) {
    return this.carpoolService.myRides(user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createRide(@Body() dto: CreateRideDto, @CurrentUser() user: JwtPayload) {
    return this.carpoolService.createRide(dto, user.sub);
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.CREATED)
  joinRide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: JoinRideDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.carpoolService.joinRide(id, user.sub, dto);
  }

  @Delete(':id/join')
  @HttpCode(HttpStatus.OK)
  cancelJoin(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.carpoolService.cancelJoin(id, user.sub);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelRide(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.carpoolService.cancelRide(id, user.sub);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  activateRide(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.carpoolService.activateRide(id, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteRide(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.carpoolService.deleteRide(id, user.sub);
  }

  @Patch(':id/passengers/:passengerId/confirm')
  @HttpCode(HttpStatus.OK)
  confirmPassenger(
    @Param('id', ParseUUIDPipe) rideId: string,
    @Param('passengerId', ParseUUIDPipe) passengerId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.carpoolService.confirmPassenger(rideId, passengerId, user.sub);
  }

  @Patch(':id/passengers/:passengerId/decline')
  @HttpCode(HttpStatus.OK)
  declinePassenger(
    @Param('id', ParseUUIDPipe) rideId: string,
    @Param('passengerId', ParseUUIDPipe) passengerId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.carpoolService.declinePassenger(rideId, passengerId, user.sub);
  }
}
