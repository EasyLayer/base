import { Injectable } from '@nestjs/common';
import { IsString } from 'class-validator';

@Injectable()
export class AppConfig {
  @IsString()
  BITCOIN_WALLET_MODULE_NAME: string = 'Default Name';
}
