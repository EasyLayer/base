import { Injectable } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { AppConfig, DbConfig } from './config';

@Injectable()
export class CoreService {
  constructor(
    private readonly log: AppLogger,
    private readonly appConfig: AppConfig,
    private readonly dbConfig: DbConfig
  ) {}

  public test() {
    this.log.info('Doing something', { detail: 'additional info' });
    this.log.info(`HOST: ${this.appConfig.HOST}`);
    this.log.info(`DB HOST: ${this.dbConfig.DB_HOST}`);
  }
}
