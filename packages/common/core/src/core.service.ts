import { Injectable } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';

@Injectable()
export class CoreService {
  constructor(private readonly log: AppLogger) {}

  public test() {
    this.log.info('Doing something', { detail: 'additional info' });
  }
}
