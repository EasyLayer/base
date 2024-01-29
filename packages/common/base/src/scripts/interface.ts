import { DynamicModule } from '@nestjs/common';

export interface GenerateDocOptions {
  title: string;
  name: string;
  version: string;
  outputPath: string;
  module: DynamicModule;
}
