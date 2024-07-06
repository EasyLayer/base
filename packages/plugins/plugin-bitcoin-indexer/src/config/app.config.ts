import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, IsBoolean } from 'class-validator';

@Injectable()
export class AppConfig {
  @Transform(({ value }) => value ?? 'BitcoinIndexer')
  @IsString()
  BITCOIN_INDEXER_MODULE_NAME: string = 'BitcoinIndexer';

  @Transform(({ value }) => value ?? true)
  @IsBoolean()
  BITCOIN_INDEXER_IS_TRANSPORT_MODE: boolean = false;

  isPRODUCTION(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isDEBUG(): boolean {
    return process.env.DEBUG === 'y';
  }

  isTEST(): boolean {
    return process.env.NODE_ENV === 'test';
  }
}
