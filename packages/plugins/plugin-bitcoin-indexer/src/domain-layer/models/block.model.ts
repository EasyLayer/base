import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinBlockIndexStartedEvent,
  BitcoinBlockIndexCompletedEvent
} from '@easylayer/domain-cqrs-components/bitcoin';

export class Block extends AggregateRoot {
  public aggregateId!: string; // block height
  public block!: any; // without transactions (or just with transactions hashes)
  public status!: string; // indexing or completed
  public batches!: Map<string, string>;

  // This is create aggregate method
  public async index({ aggregateId, block, batches }: { aggregateId: string; block: any, batches: Map<string, string> }) {
    // QUESTION: if the status does not match, should I throw an error or just skip it?
    if (this.status === 'indexing') {
      throw new Error('Block already start indexing');
    }

    await this.apply(new BitcoinBlockIndexStartedEvent({ aggregateId, block, batches, status: 'indexing' }));
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

  private onBitcoinBlockIndexStartedEvent({ payload }: BitcoinBlockIndexStartedEvent) {
    const { aggregateId, block, status, batches } = payload;
    this.aggregateId = aggregateId;
    this.block = block;
    this.status = status;
    this.batches = batches;
  }

  // private onBitcoinBlockIndexCompletedEvent({ payload }: BitcoinBlockIndexCompletedEvent) {
  //   const { transactionsPoolId, status } = payload;
  //   this.transactionsPoolId = transactionsPoolId;
  //   this.status = status;
  // }
}
