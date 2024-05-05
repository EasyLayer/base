import { AggregateRoot } from '@easylayer/cqrs';
import { BitcoinTransactionCreatedEvent } from '@easylayer/domain-cqrs-components/bitcoin';

export class Transaction extends AggregateRoot {
  public aggregateId!: string; // uuid
  public blockId!: string; // block hash
  public transaction!: any;

  public async create({
    aggregateId,
    transaction,
    blockId,
    requestId
  }: {
    aggregateId: string;
    transaction: any;
    blockId: string;
    requestId: string
  }) {
    await this.apply(new BitcoinTransactionCreatedEvent({ aggregateId, transaction, blockId, requestId }));
  }

  private onBitcoinTransactionCreatedEvent({ payload }: BitcoinTransactionCreatedEvent) {
    const { aggregateId, transaction, blockId } = payload;
    this.aggregateId = aggregateId;
    this.transaction = transaction;
    this.blockId = blockId;
  }
}
