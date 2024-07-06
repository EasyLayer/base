import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBigInt } from '../decorators';

@Injectable()
export class BusinessConfig {
  @Transform(({ value }) => (value ? BigInt(value) : BigInt(Number.MAX_SAFE_INTEGER)))
  @IsBigInt()
  BITCOIN_INDEXER_MAX_BLOCK_HEIGHT: bigint = BigInt(Number.MAX_SAFE_INTEGER);

  @Transform(({ value }) => (value ? BigInt(value) : 0n))
  @IsBigInt()
  BITCOIN_INDEXER_START_BLOCK_HEIGHT: bigint = 0n;
}
