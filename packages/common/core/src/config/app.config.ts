import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, IsNumber, Min, Max } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';

@Injectable()
export class AppConfig {
  @Transform(({ value }) => value ?? 'development')
  @IsString()
  @JSONSchema({ description: 'Node environment', default: 'development' })
  NODE_ENV!: string;

  @Transform(({ value }) => value ?? '0.0.0.0')
  @IsString()
  @JSONSchema({ description: 'Server host' })
  HOST!: string;

  @Transform(({ value }) => parseInt(value, 10) || 3000)
  @IsNumber()
  // Using min max as a replacement for isPort
  @Min(0)
  @Max(65535)
  @JSONSchema({ description: 'Server port' })
  PORT!: number;

  isDEVELOPMENT(): boolean {
    return process.env.NODE_ENV === 'development';
  }
}
