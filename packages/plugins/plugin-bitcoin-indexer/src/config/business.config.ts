import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';

@Injectable()
export class BusinessConfig {
  @Transform(({ value }) => (value !== undefined ? Number(value) : Number.MAX_SAFE_INTEGER))
  @IsNumber()
  BITCOIN_INDEXER_MAX_BLOCK_HEIGHT: number = Number.MAX_SAFE_INTEGER;

  @Transform(({ value }) => (value !== undefined ? Number(value) : 0))
  @IsNumber()
  BITCOIN_INDEXER_START_BLOCK_HEIGHT: number = 0;
}
