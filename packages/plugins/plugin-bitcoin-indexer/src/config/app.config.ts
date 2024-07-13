import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, IsBoolean, IsNumber } from 'class-validator';

@Injectable()
export class AppConfig {
  @Transform(({ value }) => value ?? 'BitcoinIndexer')
  @IsString()
  BITCOIN_INDEXER_MODULE_NAME: string = 'BitcoinIndexer';

  @Transform(({ value }) => value ?? true)
  @IsBoolean()
  BITCOIN_INDEXER_IS_TRANSPORT_MODE: boolean = false;

  @Transform(({ value }) => value ?? Number(value))
  @IsNumber()
  BITCOIN_INDEXER_MAX_TRANSACTIONS_BATCH_SIZE: number = 10 * 1000 * 1024; // 1000 KB;

  isPRODUCTION(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isDEBUG(): boolean {
    return process.env.DEBUG === 'y';
  }

  isTEST(): boolean {
    return process.env.NODE_ENV === 'test';
  }
}
