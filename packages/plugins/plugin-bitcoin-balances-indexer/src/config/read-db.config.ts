import { Injectable } from '@nestjs/common';
import { IsString, IsBoolean, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

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

  @Transform(({ value }) => (value ? Number(value) : 60000))
  @IsNumber()
  BITCOIN_BALANCES_INDEXER_READ_DB_SQLITE_MAX_VARIABLES: number = 60000;

  isLogging(): boolean {
    return process.env.DB_DEBUG === '1';
  }
}
