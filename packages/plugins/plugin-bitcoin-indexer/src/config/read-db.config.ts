import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, IsBoolean, IsNumber } from 'class-validator';

type DatabaseTypes = 'sqlite' | 'postgres';

@Injectable()
export class ReadDatabaseConfig {
  @Transform(({ value }) => (value ? value : 'sqlite'))
  @IsString()
  BITCOIN_INDEXER_READ_DB_TYPE: DatabaseTypes = 'sqlite';

  @Transform(({ value }) => (value ? value : 'indexer-read'))
  @IsString()
  BITCOIN_INDEXER_READ_DB_NAME: string = 'indexer-read';

  // TODO
  @IsBoolean()
  BITCOIN_INDEXER_READ_DB_SYNCHRONIZE: boolean = true;

  @Transform(({ value }) => (value ? Number(value) : 60000))
  @IsNumber()
  BITCOIN_INDEXER_READ_DB_SQLITE_MAX_VARIABLES: number = 60000;

  isLogging(): boolean {
    return process.env.DB_DEBUG === '1';
  }
}
