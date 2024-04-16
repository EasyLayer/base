import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinTransactionsPoolCreatedEvent,
  BitcoinTransactionsPoolUpdatedEvent,
} from '@easylayer/domain-cqrs-components';

export class TransactionsPool extends AggregateRoot {
  public aggregateId!: string; // uuid
  public batches!: any[];
  public status!: string; // in_process, completed
  public blockId!: string;

  public async create({ aggregateId, batches, blockId }: { aggregateId: string; batches: any[]; blockId: string }) {
    if (this.status !== 'completed') {
      await this.apply(
        new BitcoinTransactionsPoolCreatedEvent({ aggregateId, batches, blockId, status: 'in_process' })
      );
    }
  }

  public async update({ batches, status }: { batches: any[]; status: string }) {
    if (this.status === 'in_process') {
      await this.apply(
        new BitcoinTransactionsPoolUpdatedEvent({
          aggregateId: this.aggregateId,
          batches,
          blockId: this.blockId,
          status,
        })
      );
    }
  }

  private onBitcoinTransactionsPoolCreatedEvent({ payload }: BitcoinTransactionsPoolCreatedEvent) {
    const { aggregateId, batches, blockId, status } = payload;
    this.aggregateId = aggregateId;
    this.batches = batches;
    this.blockId = blockId;
    this.status = status;
  }

  private onBitcoinTransactionsPoolUpdatedEvent({ payload }: BitcoinTransactionsPoolUpdatedEvent) {
    const { batches, status } = payload;
    this.batches = batches;
    this.status = status;
  }
}
