import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';
import { IsBigInt } from '../decorators';

@Injectable()
export class SystemConfig {
  @Transform(({ value }) => parseInt(value, 10) ?? 1)
  @IsNumber()
  BITCOIN_INDEXER_BLOCKS_QUEUE_WORKERS_NUM: number = 1;

  @Transform(({ value }) => parseInt(value, 10) ?? 100)
  @IsNumber()
  BITCOIN_INDEXER_BLOCKS_QUEUE_MAX_SIZE: number = 100;

  @Transform(({ value }) =>  (value ? BigInt(value) : BigInt(Number.MAX_SAFE_INTEGER)))
  @IsBigInt()
  BITCOIN_INDEXER_MAX_BLOCK_HEIGHT: bigint = BigInt(Number.MAX_SAFE_INTEGER);

  isPRODUCTION(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isTEST(): boolean {
    return process.env.NODE_ENV === 'test';
  }
}
