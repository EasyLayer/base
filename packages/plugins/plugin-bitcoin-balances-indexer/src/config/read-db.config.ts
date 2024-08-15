import { Injectable } from '@nestjs/common';
import { IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

type DatabaseTypes = 'sqlite' | 'postgres';

@Injectable()
export class ReadDatabaseConfig {
  @Transform(({ value }) => (value ? value : 'sqlite'))
  @IsString()
  BITCOIN_BALANCES_INDEXER_READ_DB_TYPE: DatabaseTypes = 'sqlite';

  // @Transform(({ value }) => (value ? value : 'balances-indexer-views'))
  // @IsString()
  // BITCOIN_BALANCES_INDEXER_READ_DB_NAME: string = 'balances-indexer-views';

  // TODO
  @IsBoolean()
  BITCOIN_BALANCES_INDEXER_READ_DB_SYNCHRONIZE: boolean = true;

  @Transform(({ value }) => (value ? value : 'localhost'))
  @IsString()
  @IsOptional()
  BITCOIN_BALANCES_INDEXER_READ_DB_HOST?: string;

  @Transform(({ value }) => (value ? parseInt(value, 10) : 5432))
  @IsNumber()
  @IsOptional()
  BITCOIN_BALANCES_INDEXER_READ_DB_PORT?: number;

  @Transform(({ value }) => (value ? value : ''))
  @IsString()
  @IsOptional()
  BITCOIN_BALANCES_INDEXER_READ_DB_USERNAME?: string;

  @Transform(({ value }) => (value ? value : ''))
  @IsString()
  @IsOptional()
  BITCOIN_BALANCES_INDEXER_READ_DB_PASSWORD?: string;

  @Transform(({ value }) => (value ? Number(value) : 60000))
  @IsNumber()
  BITCOIN_BALANCES_INDEXER_READ_DB_SQLITE_MAX_VARIABLES: number = 60000;

  isLogging(): boolean {
    return process.env.DB_DEBUG === '1';
  }
}
