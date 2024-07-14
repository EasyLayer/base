import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
// import { IsBigInt } from './is-bigint.decorator';
import { StrategyNames } from '../batches-loader/load-strategies';

@Injectable()
export class TransactionsQueueConfig {
  @Transform(({ value }) => parseInt(value, 10) ?? 1)
  @IsNumber()
  BITCOIN_TRANSACTIONS_QUEUE_WORKERS_NUM: number = 1;

  @Transform(({ value }) => parseInt(value, 10) ?? 1000)
  @IsNumber()
  BITCOIN_TRANSACTIONS_QUEUE_MAX_LENGTH: number = 1000;

  @Transform(({ value }) => parseInt(value, 10) ?? 5000)
  @IsNumber()
  BITCOIN_TRANSACTIONS_QUEUE_MAX_TRANSACTIONS_PER_BATCH: number = 5000;

  @Transform(({ value }) => value ?? StrategyNames.PULL_BLOCKS_BY_NETWORK_PROVIDER)
  @IsString()
  BITCOIN_TRANSACTIONS_QUEUE_LOADER_STRATEGY_NAME: StrategyNames = StrategyNames.PULL_BLOCKS_BY_NETWORK_PROVIDER;
}
