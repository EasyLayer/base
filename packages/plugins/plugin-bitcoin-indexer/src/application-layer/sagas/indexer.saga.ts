import { Injectable, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Saga, ICommand, executeWithRetry } from '@easylayer/cqrs';
import { BlocksQueueService } from '@easylayer/bitcoin-blocks-queue';
import {
  BitcoinIndexerInitializedEvent,
  BitcoinIndexerBlockIndexStartedEvent,
  BitcoinIndexerChainIndexBlockConfirmedEvent,
  BitcoinIndexerBlockBatchesUpdatedEvent,
  BitcoinIndexerReorganisationStartedEvent,
  BitcoinIndexerBlockWithCompleteIndexedEvent,
  BitcoinIndexerReorganisationFinishedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { TransactionsCommandFactoryService, IndexerCommandFactoryService } from '../services';

@Injectable()
export class IndexerSaga {
  constructor(
    private readonly indexerCommandFactoryService: IndexerCommandFactoryService,
    private readonly transactionsCommandFactoryService: TransactionsCommandFactoryService,
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
          }), //this.blocksQueueService.reorganizeBlocks(payload.height),
      })
    );
  }

  @Saga()
  onBitcoinIndexerBlockIndexStartedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerBlockIndexStartedEvent,
        command: ({ payload }) =>
          this.transactionsCommandFactoryService.indexTransactionsBatch({
            batches: payload.batches,
            block: payload.block,
            requestId: payload.requestId,
          }),
      })
      // catchError((error) => {
      //   console.error(`Error handling <BitcoinBlockIndexStartedEvent> for event: ${error}`);
      //   return of();
      // })
    );
  }

  @Saga()
  onBitcoinIndexerChainIndexBlockConfirmedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerChainIndexBlockConfirmedEvent,
        command: ({ payload }) => this.blocksQueueService.confirmIndexBlock(payload.block.hash),
      })
      // catchError((error) => {
      //   console.error(`Error handling <BitcoinIndexerIndexBlockConfirmedEvent> for event: ${error}`);
      //   return of();
      // })
    );
  }

  @Saga()
  onBitcoinIndexerBlockWithCompleteIndexedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerBlockWithCompleteIndexedEvent,
        command: ({ payload }) => this.blocksQueueService.confirmIndexBlock(payload.block.hash),
      })
      // catchError((error) => {
      //   console.error(`Error handling <BitcoinBlockWithCompleteIndexedEvent> for event: ${error}`);
      //   return of();
      // })
    );
  }

  @Saga()
  onBitcoinIndexerBlockBatchesUpdatedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerBlockBatchesUpdatedEvent,
        command: ({ payload }) =>
          this.transactionsCommandFactoryService.indexTransactionsBatch({
            batches: payload.batches,
            block: payload.block,
            requestId: payload.requestId,
          }),
      })
      // catchError((error) => {
      //   console.error(`Error handling <BitcoinBlockBatchesUpdatedEvent> for event: ${error}`);
      //   return of();
      // })
    );
  }
}
