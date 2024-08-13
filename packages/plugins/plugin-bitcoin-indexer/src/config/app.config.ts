import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

@Injectable()
export class AppConfig {
  @Transform(({ value }) => (value !== undefined ? value : 'BitcoinIndexer'))
  @IsString()
  BITCOIN_INDEXER_MODULE_NAME: string = 'BitcoinIndexer';

  isPRODUCTION(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isDEBUG(): boolean {
    return process.env.DEBUG === '1';
  }

  isTEST(): boolean {
    return process.env.NODE_ENV === 'test';
  }
}
