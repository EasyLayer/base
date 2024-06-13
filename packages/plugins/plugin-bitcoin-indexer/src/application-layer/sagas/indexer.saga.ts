import { v4 as uuidv4 } from 'uuid';
import { Injectable, Inject } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Saga, ICommand, ofType, executeWithRetry } from '@easylayer/cqrs';
import {
  BitcoinIndexerInitializedEvent,
  BitcoinBlockIndexStartedEvent,
  BitcoinIndexerIndexBlockConfirmedEvent,
  BitcoinBlockBatchesUpdatedEvent,
  BitcoinIndexerReorganisationEvent,
  BitcoinBlockWithCompleteIndexedEvent
} from '@easylayer/domain-cqrs-components/bitcoin';
import { TransactionsCommandFactoryService } from '../services';
import { BlocksQueueService } from '../blocks-queue/blocks-queue.service';

@Injectable()
export class IndexerSaga {
  constructor(
    private readonly transactionsCommandFactoryService: TransactionsCommandFactoryService,
    @Inject('BlocksQueueService') private readonly blocksQueueService: BlocksQueueService,
  ) {}

  @Saga()
  onBitcoinIndexerInitializedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerInitializedEvent,
        command: ({ payload }: BitcoinIndexerInitializedEvent) =>
          this.blocksQueueService.runQueue(payload.height)
      }),
      // catchError((error) => {
      //   console.error(`Error handling <BitcoinIndexerInitializedEvent> for event: ${error}`);
      //   return of();
      // })
    );
  }

  @Saga()
  onBitcoinIndexerReorganisationEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerReorganisationEvent,
        command: ({ payload }) =>
          this.blocksQueueService.reorganizeBlocks(payload.height)
      }),
      // catchError((error) => {
      //   console.error(`Error handling <BitcoinIndexerReorganisationEvent> for event: ${error}`);
      //   return of();
      // })
    );
  }

  @Saga()
  onBitcoinBlockIndexStartedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinBlockIndexStartedEvent,
        command: ({ payload }) =>
          this.transactionsCommandFactoryService.indexTransactionsBatch({
            batches: payload.batches,
            block: payload.block,
            requestId: uuidv4()
          }),
      }),
      // catchError((error) => {
      //   console.error(`Error handling <BitcoinBlockIndexStartedEvent> for event: ${error}`);
      //   return of();
      // })
    );
  }

  @Saga()
  onBitcoinIndexerIndexBlockConfirmedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerIndexBlockConfirmedEvent,
        command: ({ payload }) =>
          // TODO: think do we need params block here?
          this.blocksQueueService.confirmIndexBlock()
      }),
      // catchError((error) => {
      //   console.error(`Error handling <BitcoinIndexerIndexBlockConfirmedEvent> for event: ${error}`);
      //   return of();
      // })
    );
  }

  @Saga()
  onBitcoinBlockWithCompleteIndexedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinBlockWithCompleteIndexedEvent,
        command: ({ payload }) =>
          // TODO: think do we need params block here?
          this.blocksQueueService.confirmIndexBlock()
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinBlockWithCompleteIndexedEvent> for event: ${error}`);
        return of();
      })
    );
  }

  @Saga()
  onBitcoinBlockBatchesUpdatedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinBlockBatchesUpdatedEvent,
        command: ({ payload }) =>
          this.transactionsCommandFactoryService.indexTransactionsBatch({
            batches: payload.batches,
            block: payload.block,
            requestId: uuidv4()
          }),
      }),
      // catchError((error) => {
      //   console.error(`Error handling <BitcoinBlockBatchesUpdatedEvent> for event: ${error}`);
      //   return of();
      // })
    );
  }
}
