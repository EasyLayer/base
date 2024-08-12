import { Injectable } from '@nestjs/common';
// import { Transform } from 'class-transformer';
import { IsString, IsBoolean } from 'class-validator';

type DatabaseTypes = 'sqlite' | 'postgres';

@Injectable()
export class EventStoreConfig {
  // @Transform(({ value }) => value ?? 'sqlite')
  @IsString()
  BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_TYPE: DatabaseTypes = 'sqlite';

  @IsString()
  BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_NAME: string = 'balances-indexer-write';

  // TODO
  @IsBoolean()
  BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_SYNCHRONIZE: boolean = true;

  isLogging(): boolean {
    return process.env.DB_DEBUG === '1';
  }
}
