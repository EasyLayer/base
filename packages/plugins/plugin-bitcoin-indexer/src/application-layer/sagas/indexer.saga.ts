import { Injectable, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Saga, ICommand, executeWithRetry } from '@easylayer/cqrs';
import { BlocksQueueService } from '@easylayer/bitcoin-blocks-queue';
import {
  BitcoinIndexerInitializedEvent,
  BitcoinIndexerBlockIndexedEvent,
  BitcoinIndexerReorganisationStartedEvent,
  BitcoinIndexerReorganisationFinishedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { IndexerCommandFactoryService } from '../services';

@Injectable()
export class IndexerSaga {
  constructor(
    private readonly indexerCommandFactoryService: IndexerCommandFactoryService,
    @Inject('BlocksQueueService') private readonly blocksQueueService: BlocksQueueService
  ) {}

  @Saga()
  onBitcoinIndexerInitializedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerInitializedEvent,
        command: ({ payload }: BitcoinIndexerInitializedEvent) => this.blocksQueueService.start(payload.indexedHeight),
      })
    );
  }

  @Saga()
  onBitcoinIndexerReorganisationFinishedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerReorganisationFinishedEvent,
        command: ({ payload }) => this.blocksQueueService.reorganizeBlocks(payload.height),
      })
    );
  }

  @Saga()
  onBitcoinIndexerReorganisationStartedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerReorganisationStartedEvent,
        command: ({ payload }) =>
          this.indexerCommandFactoryService.processReorganisation({
            blocks: payload.blocks,
            height: payload.height,
            reuestId: payload.requestId,
          }),
      })
    );
  }

  @Saga()
  onBitcoinIndexerBlockIndexedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerBlockIndexedEvent,
        command: ({ payload }) => this.blocksQueueService.confirmIndexBlock(payload.block.hash),
      })
    );
  }
}
