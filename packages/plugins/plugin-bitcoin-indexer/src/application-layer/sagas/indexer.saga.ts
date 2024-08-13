import { v4 as uuidv4 } from 'uuid';
import { Injectable, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Saga, ICommand, executeWithRetry } from '@easylayer/core/cqrs';
import { BlocksQueueService } from '@easylayer/core/bitcoin-blocks-queue';
import {
  BitcoinIndexerReorganisationStartedEvent,
  BitcoinIndexerReorganisationFinishedEvent,
} from '@easylayer/components/domain-cqrs-components/bitcoin-indexer';
import { IndexerCommandFactoryService } from '../services';

@Injectable()
export class IndexerSaga {
  constructor(
    private readonly indexerCommandFactory: IndexerCommandFactoryService,
    @Inject('BlocksQueueService') private readonly blocksQueueService: BlocksQueueService
  ) {}

  @Saga()
  onBitcoinIndexerReorganisationStartedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerReorganisationStartedEvent,
        command: ({ payload }: BitcoinIndexerReorganisationStartedEvent) =>
          this.indexerCommandFactory.processReorganisation({
            blocks: payload.blocks,
            height: payload.height,
            // IMPORTANT: Generate a new requestId here
            // since the reorganisation event is triggered automatically recursively.
            requestId: uuidv4(),
          }),
      })
    );
  }

  // @Saga()
  // onBitcoinBalancesIndexerReorganisationProcessedEvent(events$: Observable<any>): Observable<ICommand> {
  //   return events$.pipe(
  //     executeWithRetry({
  //       event: BitcoinBalancesIndexerReorganisationProcessedEvent,
  //       command: ({ payload }: BitcoinBalancesIndexerReorganisationProcessedEvent) =>
  //         this.indexerCommandFactory.processReorganisation({
  //           blocks: payload.blocks,
  //           height: payload.height,
  //           // IMPORTANT: Generate a new requestId here
  //           // since the reorganisation event is triggered automatically recursively.
  //           requestId: uuidv4(),
  //         }),
  //     })
  //   );
  // }

  @Saga()
  onBitcoinIndexerReorganisationFinishedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerReorganisationFinishedEvent,
        command: ({ payload }: BitcoinIndexerReorganisationFinishedEvent) =>
          this.blocksQueueService.reorganizeBlocks(payload.height),
      })
    );
  }
}
