import { Injectable } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';

@Injectable()
export class AppService {
  constructor(private readonly log: AppLogger) {}

  public test() {
    this.log.info('Doing something', { detail: 'additional info' });
  }
}
