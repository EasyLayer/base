import { AggregateRoot } from '@easylayer/cqrs';
import { BitcoinDepositReceivedEvent } from '@easylayer/domain-cqrs-components';

export class Wallet extends AggregateRoot {
  public aggregateId!: string; // uuid
  public value!: number; // just example

  public deposit({ aggregateId, value }: { aggregateId: string; value: number }) {
    this.apply(new BitcoinDepositReceivedEvent({ aggregateId, value }));
  }

  private onBitcoinDepositReceivedEvent({ payload }: BitcoinDepositReceivedEvent) {
    const { aggregateId, value } = payload;
    this.aggregateId = aggregateId;
    this.value += value;
  }
}
