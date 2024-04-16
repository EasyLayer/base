import { Injectable } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';

@Injectable()
export class BitcoinParserService {
  constructor(private readonly log: AppLogger) {}

  test() {
    this.log.info('BitcoinParserService test()\n');
  }
}
