import { v4 as uuidv4 } from 'uuid';
import { Injectable, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
// import { catchError } from 'rxjs/operators';
import { Saga, ICommand, executeWithRetry } from '@easylayer/cqrs';
import { BlocksQueueService } from '@easylayer/bitcoin-blocks-queue';
import {
  BitcoinIndexerInitializedEvent,
  BitcoinIndexerBlockIndexStartedEvent,
  BitcoinIndexerChainIndexBlockConfirmedEvent,
  BitcoinIndexerBlockBatchesUpdatedEvent,
  BitcoinIndexerReorganisationEvent,
  BitcoinIndexerBlockWithCompleteIndexedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { TransactionsCommandFactoryService } from '../services';

@Injectable()
export class IndexerSaga {
  constructor(
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
  onBitcoinIndexerReorganisationEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerReorganisationEvent,
        command: ({ payload }) => this.blocksQueueService.reorganizeBlocks(payload.height),
      })
      // catchError((error) => {
      //   console.error(`Error handling <BitcoinIndexerReorganisationEvent> for event: ${error}`);
      //   return of();
      // })
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
            requestId: uuidv4(),
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
            requestId: uuidv4(),
          }),
      })
      // catchError((error) => {
      //   console.error(`Error handling <BitcoinBlockBatchesUpdatedEvent> for event: ${error}`);
      //   return of();
      // })
    );
  }
}
