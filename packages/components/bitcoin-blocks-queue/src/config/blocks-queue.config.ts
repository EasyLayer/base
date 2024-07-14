import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { StrategyNames } from '../blocks-loader/load-strategies';

@Injectable()
export class BlocksQueueConfig {
  @Transform(({ value }) => parseInt(value, 10) ?? 1)
  @IsNumber()
  BITCOIN_BLOCKS_QUEUE_WORKERS_NUM: number = 1;

  @Transform(({ value }) => parseInt(value, 10) ?? 100)
  @IsNumber()
  BITCOIN_BLOCKS_QUEUE_MAX_LENGTH: number = 100;

  @Transform(({ value }) => value ?? StrategyNames.PULL_NETWORK_PROVIDER)
  @IsString()
  BITCOIN_BLOCKS_QUEUE_LOADER_STRATEGY_NAME: StrategyNames = StrategyNames.PULL_NETWORK_PROVIDER;
}
