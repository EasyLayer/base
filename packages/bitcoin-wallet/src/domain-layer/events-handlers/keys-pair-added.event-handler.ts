import { EventsHandler, IEventHandler } from '@easylayer/core/cqrs';
import { BitcoinKeysPairAddedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-wallet';

@EventsHandler(BitcoinKeysPairAddedEvent)
export class BitcoinKeysPairAddedEventHandler implements IEventHandler<BitcoinKeysPairAddedEvent> {
  async handle({ payload }: BitcoinKeysPairAddedEvent) {
    const { requestId, aggregateId, publicKeyHash } = payload;

    return {
      result: { requestId, aggregateId, publicKeyHash },
    };
  }
}
