import { AggregateRoot } from '@easylayer/cqrs';
import { BitcoinBlockIndexedEvent, BitcoinBlockIndexCompletedEvent } from '@easylayer/domain-cqrs-components';

export class Block extends AggregateRoot {
  public aggregateId!: string; // uuid
  public block!: any; // just example
  public status!: string; // aggregate status
  public transactionsPoolId!: string;

  // This is create aggregate method
  public async indexBlock({ aggregateId, block }: { aggregateId: string; block: any }) {
    // QUESTION: if the status does not match, should I throw an error or just skip it?
    if (this.status !== 'indexing' && this.status !== 'indexed') {
      await this.apply(new BitcoinBlockIndexedEvent({ aggregateId, block, status: 'indexing' }));
    }
  }

  public async completeIndexBlock({
    aggregateId,
    transactionsPoolId,
  }: {
    aggregateId: string;
    transactionsPoolId: string;
  }) {
    if (this.status === 'indexing') {
      await this.apply(new BitcoinBlockIndexCompletedEvent({ aggregateId, transactionsPoolId, status: 'indexed' }));
    }
  }

  private onBitcoinBlockIndexedEvent({ payload }: BitcoinBlockIndexedEvent) {
    const { aggregateId, block, status } = payload;
    this.aggregateId = aggregateId;
    this.block = block;
    this.status = status;
  }

  private onBitcoinBlockIndexCompletedEvent({ payload }: BitcoinBlockIndexCompletedEvent) {
    const { transactionsPoolId, status } = payload;
    this.transactionsPoolId = transactionsPoolId;
    this.status = status;
  }
}
