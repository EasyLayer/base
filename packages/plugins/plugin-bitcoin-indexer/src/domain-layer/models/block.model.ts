import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinBlockIndexStartedEvent,
  BitcoinBlockIndexCompletedEvent,
  BitcoinBlockBatchesUpdatedEvent,
  BitcoinBlockWithCompleteIndexedEvent
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

    await this.apply(new BitcoinBlockIndexStartedEvent({
      aggregateId,
      block,
      batches: Object.fromEntries(batches),
      requestId,
      status: 'indexing'
    }));
  }

  // This is create aggregate method
  public async indexWithComplete({ aggregateId, block, batches, requestId }: { aggregateId: string; block: any, requestId: string, batches: Map<string, string> }) {
    // QUESTION: if the status does not match, should I throw an error or just skip it?
    if (this.status === 'indexing') {
      throw new Error('Block already start indexing');
    }

    for (let [id, status] of batches) {
      if (status !== 'completed') {
        throw new Error('Not all transactions batches have been indexed');
      }
    }

    await this.apply(new BitcoinBlockWithCompleteIndexedEvent({
      aggregateId,
      block,
      batches: Object.fromEntries(batches),
      requestId,
      status: 'completed'
    }));
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
      batches: Object.fromEntries(this.batches),
      block: this.block
    }));
  }

  public async completeIndexBlock({
    requestId,
  }: {
    requestId: string;
  }) {
    if (this.status === 'indexing') {
      for (let [id, status] of this.batches) {
        if (status !== 'completed') {
          throw new Error('Not all transactions batches have been indexed');
        }
      }

      await this.apply(new BitcoinBlockIndexCompletedEvent({
        aggregateId: this.aggregateId,
        requestId,
        batches: Object.fromEntries(this.batches),
        status: 'completed'
      }));
    }
  }

  private onBitcoinBlockIndexStartedEvent({ payload }: BitcoinBlockIndexStartedEvent) {
    const { aggregateId, block, status, batches } = payload;
    this.aggregateId = aggregateId;
    this.block = block;
    this.status = status;
    this.batches = new Map(Object.entries(batches));
  }

  private onBitcoinBlockIndexCompletedEvent({ payload }: BitcoinBlockIndexCompletedEvent) {
    const { status, batches } = payload;
    this.status = status;
    this.batches = new Map(Object.entries(batches));
  }

  private onBitcoinBlockBatchesUpdatedEvent({ payload }: BitcoinBlockBatchesUpdatedEvent) {
    const { batches } = payload;
    this.batches = new Map(Object.entries(batches));
  }

  private onBitcoinBlockWithCompleteIndexedEvent({ payload }: BitcoinBlockWithCompleteIndexedEvent) {
    const { aggregateId, block, status, batches } = payload;
    this.aggregateId = aggregateId;
    this.block = block;
    this.status = status;
    this.batches = new Map(Object.entries(batches));
  }
}
