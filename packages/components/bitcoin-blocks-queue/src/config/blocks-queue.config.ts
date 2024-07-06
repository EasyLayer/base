import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';
// import { IsBigInt } from './is-bigint.decorator';

@Injectable()
export class BlocksQueueConfig {
  @Transform(({ value }) => parseInt(value, 10) ?? 1)
  @IsNumber()
  BITCOIN_BLOCKS_QUEUE_WORKERS_NUM: number = 1;

  @Transform(({ value }) => parseInt(value, 10) ?? 100)
  @IsNumber()
  BITCOIN_BLOCKS_QUEUE_MAX_LENGTH: number = 100;

  // @Transform(({ value }) => (value ? BigInt(value) : BigInt(Number.MAX_SAFE_INTEGER)))
  // @IsBigInt()
  // BITCOIN_BLOCKS_QUEUE_MAX_BLOCK_HEIGHT: bigint = BigInt(Number.MAX_SAFE_INTEGER); // перенести это отсюда в плагин

  isAllowStreamLoad(): boolean {
    return typeof process.env.BITCOIN_BLOCKS_QUEUE_ALLOW_STREAM_LOAD !== 'undefined';
  }

  // isPRODUCTION(): boolean {
  //   return process.env.NODE_ENV === 'production';
  // }

  // isDEBUG(): boolean {
  //   return process.env.DEBUG === 'y';
  // }

  // isTEST(): boolean {
  //   return process.env.NODE_ENV === 'test';
  // }
}
