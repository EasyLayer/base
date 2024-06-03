import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';

@Injectable()
export class SystemConfig {
  @Transform(({ value }) => value ?? 1)
  @IsNumber()
  BITCOIN_INDEXER_BLOCKS_QUEUE_WORKERS_NUM!: number;

  @Transform(({ value }) => value ?? 100)
  @IsNumber()
  BITCOIN_INDEXER_BLOCKS_QUEUE_MAX_SIZE!: number;
}
