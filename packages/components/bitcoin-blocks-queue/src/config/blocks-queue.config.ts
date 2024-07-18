import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { StrategyNames } from '../blocks-loader/load-strategies';

@Injectable()
export class BlocksQueueConfig {
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 1))
  @IsNumber()
  BITCOIN_BLOCKS_QUEUE_WORKERS_NUM: number = 1;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 100))
  @IsNumber()
  BITCOIN_BLOCKS_QUEUE_MAX_LENGTH: number = 100;

  @Transform(({ value }) => (value !== undefined ? (value as StrategyNames) : StrategyNames.PULL_NETWORK_PROVIDER))
  @IsString()
  BITCOIN_BLOCKS_QUEUE_LOADER_STRATEGY_NAME: StrategyNames = StrategyNames.PULL_NETWORK_PROVIDER;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 1000))
  @IsNumber()
  BITCOIN_BLOCKS_QUEUE_LOADER_INTERVAL_MS: number = 1000;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 10 * 60 * 1000))
  @IsNumber()
  BITCOIN_BLOCKS_QUEUE_LOADER_MAX_INTERVAL_MS: number = 10 * 60 * 1000; // Bitcoin block time

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 10))
  @IsNumber()
  BITCOIN_BLOCKS_QUEUE_LOADER_MAX_INTERVAL_MULTIPLIER: number = 10;
}
