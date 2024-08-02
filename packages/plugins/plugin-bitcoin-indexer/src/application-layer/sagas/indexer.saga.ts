import { v4 as uuidv4 } from 'uuid';
import { Injectable, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Saga, ICommand, executeWithRetry } from '@easylayer/core/cqrs';
import { BlocksQueueService } from '@easylayer/core/bitcoin-blocks-queue';
import {
  BitcoinIndexerInitializedEvent,
  BitcoinIndexerBlockIndexedEvent,
  BitcoinIndexerReorganisationStartedEvent,
  BitcoinIndexerReorganisationFinishedEvent,
} from '@easylayer/components/domain-cqrs-components/bitcoin-indexer';
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
            // IMPORTANT: Generate a new requestId here
            // since the reorganisation event is triggered automatically recursively.
            requestId: uuidv4(),
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
