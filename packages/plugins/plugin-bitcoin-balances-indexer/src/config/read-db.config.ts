import { Injectable } from '@nestjs/common';
import { IsString, IsBoolean } from 'class-validator';

type DatabaseTypes = 'sqlite' | 'postgres';

@Injectable()
export class ReadDatabaseConfig {
  @IsString()
  BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_TYPE: DatabaseTypes = 'sqlite';

  @IsString()
  BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_NAME: string = 'balances-indexer-read';

  // TODO
  @IsBoolean()
  BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_SYNCHRONIZE: boolean = true;

  // TODO
  @IsBoolean()
  BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_IS_WAL: boolean = true;

  isLogging(): boolean {
    return process.env.DEBUG === 'y';
  }
}
