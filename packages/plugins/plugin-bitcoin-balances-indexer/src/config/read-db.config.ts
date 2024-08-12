import { Injectable } from '@nestjs/common';
import { IsString, IsBoolean } from 'class-validator';

type DatabaseTypes = 'sqlite' | 'postgres';

@Injectable()
export class ReadDatabaseConfig {
  @IsString()
  BITCOIN_BALANCES_INDEXER_READ_DB_TYPE: DatabaseTypes = 'sqlite';

  @IsString()
  BITCOIN_BALANCES_INDEXER_READ_DB_NAME: string = 'balances-indexer-read';

  // TODO
  @IsBoolean()
  BITCOIN_BALANCES_INDEXER_READ_DB_SYNCHRONIZE: boolean = true;

  isLogging(): boolean {
    return process.env.DB_DEBUG === '1';
  }
}
