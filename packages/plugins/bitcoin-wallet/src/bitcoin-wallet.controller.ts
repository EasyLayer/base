import { Controller, Get, HttpCode } from '@nestjs/common';

@Controller('bitcoin-wallet')
export class BitcoinWalletController {
  @HttpCode(200)
  @Get('healthcheck')
  healthCheck() {
    return { status: 'OK' };
  }
}
