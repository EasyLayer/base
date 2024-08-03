import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

@Injectable()
export class ProvidersConfig {
  @Transform(({ value }) => (value ? value : '127.0.0.1'))
  @IsString()
  @IsOptional()
  BITCOIN_NETWORK_PROVIDER_SELF_NODE_HOST?: string;

  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsNumber()
  @IsOptional()
  BITCOIN_NETWORK_PROVIDER_SELF_NODE_PORT?: number;

  @Transform(({ value }) => (value ? value : undefined))
  @IsString()
  @IsOptional()
  BITCOIN_NETWORK_PROVIDER_SELF_NODE_PASSWORD?: string;

  @Transform(({ value }) => (value ? value : undefined))
  @IsString()
  @IsOptional()
  BITCOIN_NETWORK_PROVIDER_SELF_NODE_USERNAME?: string;

  @Transform(({ value }) => (value ? value.split('|') : []))
  @IsArray()
  @IsOptional()
  BITCOIN_NETWORK_PROVIDER_QUICK_NODE_BASE_URLS?: string[];
}
