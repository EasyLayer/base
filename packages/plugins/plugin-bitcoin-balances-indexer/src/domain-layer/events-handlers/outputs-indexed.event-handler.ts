import { EventsHandler , IEventHandler} from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { BitcoinWalletsBatchOutputsIndexedEvent } from '@easylayer/domain-cqrs-components/bitcoin';
import { WalletsReadService, AddresesReadService, TransactionsReadService } from '../services';

@EventsHandler(BitcoinWalletsBatchOutputsIndexedEvent)
export class BitcoinWalletsBatchOutputsIndexedEventHandler
  implements IEventHandler<BitcoinWalletsBatchOutputsIndexedEvent> {
    constructor(
      private readonly log: AppLogger,
      private readonly walletsReadService: WalletsReadService,
      private readonly addresesReadService: AddresesReadService,
      private readonly transactionsReadService: TransactionsReadService,
    ) {}

    // Add @Transctional()
  async handle({ payload }: BitcoinWalletsBatchOutputsIndexedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { aggregateId, outputs } = payload;

      this.log.info('Aggregete Id Handle: ', { aggregateId, outputs }, this.constructor.name);

      // 

    //   return await this.service.create({ id: aggregateId, hash: block.hash });
    } catch(error) {
      this.log.error('handle()', error, this.constructor.name);
    }
  }
}
