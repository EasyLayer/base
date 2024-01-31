import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, IsOptional } from 'class-validator';

export const dbEnvs = {
  DB_HOST: process.env.DB_HOST,
};

@Injectable()
export class DbConfig {
  @Transform(({ value }) => value ?? '0.0.0.0')
  @IsString()
  @IsOptional()
  DB_HOST!: string;
}
