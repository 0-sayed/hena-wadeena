import { InternalGuard, Public } from '@hena-wadeena/nest-common';
import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';

import { TransferWalletDto } from './dto/transfer.dto';
import { WalletService } from './wallet.service';

@Controller('internal/wallet')
export class WalletInternalController {
  constructor(@Inject(WalletService) private readonly walletService: WalletService) {}

  @Public()
  @UseGuards(InternalGuard)
  @Post('transfer')
  async transfer(@Body() dto: TransferWalletDto) {
    return this.walletService.transfer(dto);
  }
}
