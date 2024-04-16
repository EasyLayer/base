import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinNetworkCreatedEvent,
  BitcoinUpdateIndexedBlockFromHeightEvent,
  BitcoinUpdateIndexedBlockHeightEvent,
} from '@easylayer/domain-cqrs-components';

export class Network extends AggregateRoot {
  public aggregateId!: string; // uuid
  public indexedBlockFromHeight!: bigint;
  public indexedBlockHeight!: bigint;

  public async create({ aggregateId }: { aggregateId: string }) {
    await this.apply(new BitcoinNetworkCreatedEvent({ aggregateId }));
  }

  public async updateIndexedBlockFromHeight({ aggregateId, height }: { aggregateId: string; height: bigint }) {
    await this.apply(new BitcoinUpdateIndexedBlockFromHeightEvent({ aggregateId, height }));
  }

  public async updateIndexedBlockHeight({ aggregateId, height }: { aggregateId: string; height: bigint }) {
    await this.apply(new BitcoinUpdateIndexedBlockHeightEvent({ aggregateId, height }));
  }

  private onBitcoinNetworkCreatedEvent({ payload }: BitcoinNetworkCreatedEvent) {
    const { aggregateId } = payload;
    this.aggregateId = aggregateId;
    this.indexedBlockFromHeight = BigInt(0);
    this.indexedBlockHeight = BigInt(0);
  }

  private onBitcoinUpdateIndexedBlockFromHeightEvent({ payload }: BitcoinUpdateIndexedBlockFromHeightEvent) {
    const { height } = payload;
    this.indexedBlockFromHeight = height;
  }

  private onBitcoinUpdateIndexedBlockHeightEvent({ payload }: BitcoinUpdateIndexedBlockHeightEvent) {
    const { height } = payload;
    this.indexedBlockHeight = height;
  }
}
