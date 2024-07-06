import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

@Injectable()
export class ProvidersConfig {
  @Transform(({ value }) => value ?? '0.0.0.0')
  @IsString()
  @IsOptional()
  BITCOIN_SELF_NODE_HOST?: string;

  @Transform(({ value }) => value ?? 'testnet')
  @IsString()
  @IsOptional()
  BITCOIN_SELF_NODE_NETWORK?: string;

  // @Transform(({ value }) => parseInt(value, 10) ?? 3000)
  @IsNumber()
  @IsOptional()
  BITCOIN_SELF_NODE_PORT?: number;

  @IsString()
  @IsOptional()
  BITCOIN_SELF_NODE_PASSWORD?: string;

  @IsString()
  @IsOptional()
  BITCOIN_SELF_NODE_USERNAME?: string;

  @Transform(({ value }) => (value ? value.split('|') : []))
  @IsArray()
  @IsOptional()
  BITCOIN_QUICK_NODE_BASE_URLS?: string[];
}
