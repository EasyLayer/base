import { Controller, Get, HttpCode } from '@nestjs/common';

@Controller('bitcoin-parser')
export class BitcoinParserController {
  @HttpCode(200)
  @Get('healthcheck')
  healthCheck() {
    return { status: 'OK' };
  }
}
