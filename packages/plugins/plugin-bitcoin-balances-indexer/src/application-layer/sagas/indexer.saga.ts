import { v4 as uuidv4 } from 'uuid';
import { Injectable, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Saga, ICommand, executeWithRetry } from '@easylayer/core/cqrs';
import { BlocksQueueService } from '@easylayer/core/bitcoin-blocks-queue';
import {
  BitcoinBalancesIndexerReorganisationStartedEvent,
  BitcoinBalancesIndexerReorganisationFinishedEvent,
  BitcoinBalancesIndexerReorganisationProcessedEvent,
} from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import {
  BitcoinIndexerTransactionsBatchIndexedEvent,
  BitcoinIndexerBlockIndexedEvent,
} from '@easylayer/components/domain-cqrs-components/bitcoin-indexer';
import { BalancesIndexerCommandFactoryService } from '../services';

@Injectable()
export class IndexerSaga {
  constructor(
    @Inject('BlocksQueueService') private readonly blocksQueueService: BlocksQueueService,
    private readonly indexerCommandFactory: BalancesIndexerCommandFactoryService
  ) {}

  @Saga()
  onBitcoinBalancesIndexerReorganisationStartedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinBalancesIndexerReorganisationStartedEvent,
        command: ({ payload }: BitcoinBalancesIndexerReorganisationStartedEvent) =>
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

  @Saga()
  onBitcoinBalancesIndexerReorganisationProcessedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinBalancesIndexerReorganisationProcessedEvent,
        command: ({ payload }: BitcoinBalancesIndexerReorganisationProcessedEvent) =>
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

  @Saga()
  onBitcoinBalancesIndexerReorganisationFinishedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinBalancesIndexerReorganisationFinishedEvent,
        command: ({ payload }: BitcoinBalancesIndexerReorganisationFinishedEvent) =>
          this.blocksQueueService.reorganizeBlocks(payload.height),
      })
    );
  }

  @Saga()
  onBitcoinIndexerTransactionsBatchIndexedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerTransactionsBatchIndexedEvent,
        command: ({ payload }: BitcoinIndexerTransactionsBatchIndexedEvent) => {
          return new Promise<void>((resolve) => {
            this.blocksQueueService.blocksCollector.addTransactions(payload.batch);
            resolve();
          });
        },
      })
    );
  }

  @Saga()
  onBitcoinIndexerBlockIndexedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerBlockIndexedEvent,
        command: ({ payload }: BitcoinIndexerBlockIndexedEvent) => {
          return new Promise<void>((resolve) => {
            this.blocksQueueService.blocksCollector.addBlock(payload.block, payload.txCount);
            resolve();
          });
        },
      })
    );
  }
}
