import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

@Injectable()
export class ProvidersConfig {
  @Transform(({ value }) => value ?? '0.0.0.0')
  @IsString()
  @IsOptional()
  SELF_NODE_HOST!: string;

  @Transform(({ value }) => value ?? 'testnet')
  @IsString()
  @IsOptional()
  SELF_NODE_NETWORK!: string;

  @IsNumber()
  SELF_NODE_PORT!: number;

  @IsString()
  SELF_NODE_PASSWORD!: string;

  @IsString()
  SELF_NODE_USERNAME!: string;

  @Transform(({ value }) => (value ? value.split('|') : []))
  @IsArray()
  @IsOptional()
  QUICK_NODE_BASE_URLS!: string[];
}
