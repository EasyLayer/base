import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { BitcoinSendNotificationCommand } from '@easylayer/domain-cqrs-components';
import { AppLogger } from '@easylayer/logger';

@CommandHandler(BitcoinSendNotificationCommand)
export class BitcoinSendNotificationCommandHandler implements ICommandHandler<BitcoinSendNotificationCommand> {
  constructor(private readonly log: AppLogger) {}

  async execute({ payload }: BitcoinSendNotificationCommand) {
    try {
      this.log.debug('5execute()', payload, this.constructor.name);

      const { aggregateId, type } = payload;

      const params = { aggregateId, type };

      // Here do domething with aggregate

      this.log.debug(`6Notification successfull sent`, params, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
