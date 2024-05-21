import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

@Injectable()
export class AppConfig {
  @Transform(({ value }) => value ?? 'BitcoinBalancesIndexer')
  @IsString()
  BITCOIN_INDEXER_MODULE_NAME!: string;
}
