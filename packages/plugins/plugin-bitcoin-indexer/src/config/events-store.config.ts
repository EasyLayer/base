import { Injectable } from '@nestjs/common';
import { IsString, IsBoolean } from 'class-validator';

type DatabaseTypes = 'sqlite' | 'postgres';

@Injectable()
export class EventStoreConfig {
  @IsString()
  BITCOIN_INDEXER_EVENTSTORE_DB_TYPE: DatabaseTypes = 'sqlite';

  @IsString()
  BITCOIN_INDEXER_EVENTSTORE_DB_NAME: string = 'indexer-write';

  // TODO
  @IsBoolean()
  BITCOIN_INDEXER_EVENTSTORE_DB_SYNCHRONIZE: boolean = true;

  // TODO
  @IsBoolean()
  BITCOIN_INDEXER_EVENTSTORE_DB_IS_WAL: boolean = true;

  isLogging(): boolean {
    return process.env.DB_DEBUG === '1';
  }
}
