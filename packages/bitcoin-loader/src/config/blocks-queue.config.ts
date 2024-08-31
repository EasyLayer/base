import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

@Injectable()
export class BlocksQueueConfig {
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 1))
  @IsNumber()
  BITCOIN_INDEXER_BLOCKS_QUEUE_WORKERS_NUM: number = 1;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 3000))
  @IsNumber()
  BITCOIN_INDEXER_BLOCKS_QUEUE_MAX_LENGTH: number = 3000;

  @Transform(({ value }) => (value !== undefined ? value : 'pull-network-provider-by-batches'))
  @IsString()
  BITCOIN_INDEXER_BLOCKS_QUEUE_LOADER_STRATEGY_NAME: string = 'pull-network-provider-by-batches';

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 200))
  @IsNumber()
  BITCOIN_INDEXER_BLOCKS_QUEUE_LOADER_NETWORK_PROVIDER_BATCHES_LENGTH: number = 200;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 500))
  @IsNumber()
  BITCOIN_INDEXER_BLOCKS_QUEUE_LOADER_INTERVAL_MS: number = 500;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 10 * 60 * 1000))
  @IsNumber()
  BITCOIN_INDEXER_BLOCKS_QUEUE_LOADER_MAX_INTERVAL_MS: number = 10 * 60 * 1000; // Bitcoin block time

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 1))
  @IsNumber()
  BITCOIN_INDEXER_BLOCKS_QUEUE_LOADER_MAX_INTERVAL_MULTIPLIER: number = 1;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 1 * 1024 * 1024))
  @IsNumber()
  BITCOIN_INDEXER_BLOCKS_QUEUE_ITERATOR_BLOCKS_BATCH_SIZE: number = 1 * 1024 * 1024;
}
