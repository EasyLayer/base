import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, IsBoolean } from 'class-validator';

@Injectable()
export class AppConfig {
  @Transform(({ value }) => (value !== undefined ? value : 'BitcoinBalancesIndexer'))
  @IsString()
  BITCOIN_BALANCES_INDEXER_MODULE_NAME: string = 'BitcoinBalancesIndexer';

  @Transform(({ value }) => (value !== undefined ? !!value : false))
  @IsBoolean()
  BITCOIN_BALANCES_INDEXER_IS_TRANSPORT_MODE: boolean = false;

  isPRODUCTION(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isDEBUG(): boolean {
    return process.env.DEBUG === '1';
  }

  isTEST(): boolean {
    return process.env.NODE_ENV === 'test';
  }
}
