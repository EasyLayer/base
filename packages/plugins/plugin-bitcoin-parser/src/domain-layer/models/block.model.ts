import { AggregateRoot } from '@easylayer/cqrs';
import { BitcoinBlockParsedEvent } from '@easylayer/domain-cqrs-components';

export class Block extends AggregateRoot {
  public aggregateId!: string; // uuid
  public block!: any; // just example

  // This is create aggregate method
  public parseBlock({ aggregateId, block }: { aggregateId: string; block: any }) {
    this.apply(new BitcoinBlockParsedEvent({ aggregateId, block }));
  }

  private onBitcoinBlockParsedEvent({ payload }: BitcoinBlockParsedEvent) {
    const { aggregateId, block } = payload;
    this.aggregateId = aggregateId;
    this.block = block;
  }
}
