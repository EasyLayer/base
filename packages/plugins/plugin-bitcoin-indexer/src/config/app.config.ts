import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, IsNumber } from 'class-validator';

@Injectable()
export class AppConfig {
  @Transform(({ value }) => (value !== undefined ? value : 'BitcoinIndexer'))
  @IsString()
  BITCOIN_INDEXER_MODULE_NAME: string = 'BitcoinIndexer';

  @Transform(({ value }) => (value !== undefined ? Number(value) : 10 * 1000 * 1024))
  @IsNumber()
  BITCOIN_INDEXER_MAX_TRANSACTIONS_BATCH_SIZE: number = 10 * 1000 * 1024; // 1000 KB;

  @Transform(({ value }) => (value !== undefined ? Number(value) : 10))
  @IsNumber()
  BITCOIN_INDEXER_START_INIT_REPUBLISH_BLOCKS_COUNT: number = 10;

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
