import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinBlockIndexStartedEvent,
  BitcoinBlockIndexCompletedEvent,
  BitcoinBlockBatchesUpdatedEvent
} from '@easylayer/domain-cqrs-components/bitcoin';

export class Block extends AggregateRoot {
  public aggregateId!: string; // block height
  public block!: any; // without transactions (or just with transactions hashes)
  public status!: string; // indexing or completed
  public batches!: Map<string, string>; // { <aggregateId>:<status> }

  // This is create aggregate method
  public async index({ aggregateId, block, batches, requestId }: { aggregateId: string; block: any, requestId: string, batches: Map<string, string> }) {
    // QUESTION: if the status does not match, should I throw an error or just skip it?
    if (this.status === 'indexing') {
      throw new Error('Block already start indexing');
    }

    await this.apply(new BitcoinBlockIndexStartedEvent({ aggregateId, block, batches, requestId, status: 'indexing' }));
  }

  public async updateBatches({ batchesHashes, requestId }: { batchesHashes: string[], requestId: string }) {

    for (let batchId of batchesHashes) {
      if (!this.batches.has(batchId)) {
        throw new Error('');
      }

      this.batches.set(batchId, 'completed');
    }

    await this.apply(new BitcoinBlockBatchesUpdatedEvent({
      aggregateId: this.aggregateId,
      requestId,
      batches: this.batches,
      block: this.block
    }));
  }

  // TODO
  public async completeIndexBlock({
    requestId,
    batches
  }: {
    requestId: string;
    batches: Map<string, string>
  }) {
    if (this.status === 'indexing') {
      // TODO: add check batches (must be all have status created)

      await this.apply(new BitcoinBlockIndexCompletedEvent({ aggregateId: this.aggregateId, requestId, status: 'completed' }));
    }
  }

  private onBitcoinBlockIndexStartedEvent({ payload }: BitcoinBlockIndexStartedEvent) {
    const { aggregateId, block, status, batches } = payload;
    this.aggregateId = aggregateId;
    this.block = block;
    this.status = status;
    this.batches = batches;
  }

  private onBitcoinBlockIndexCompletedEvent({ payload }: BitcoinBlockIndexCompletedEvent) {
    const { status } = payload;
    this.status = status;
  }

  private onBitcoinBlockBatchesUpdatedEvent({ payload }: BitcoinBlockBatchesUpdatedEvent) {
    const { batches } = payload;
    this.batches = batches;
  }
}
