import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SyncSaga, ICommand, ofType, execute } from '@easylayer/cqrs';
import {
  BitcoinIndexerInitializedEvent,
  BitcoinBlockIndexStartedEvent,
  BitcoinIndexerIndexBlockConfirmedEvent,
  BitcoinBlockBatchesUpdatedEvent,
  BitcoinIndexerReorganisationEvent,
  BitcoinBlockWithCompleteIndexedEvent
} from '@easylayer/domain-cqrs-components/bitcoin';
import { BlocksCommandFactoryService, TransactionsCommandFactoryService } from '../services';
import { BlocksQueueService } from '../blocks-queue/blocks-queue.service';

@Injectable()
export class IndexerSaga {
  constructor(
    private readonly transactionsCommandFactoryService: TransactionsCommandFactoryService,
    private readonly blocksQueueService: BlocksQueueService,
  ) {}

  @SyncSaga()
  onBitcoinIndexerInitializedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinIndexerInitializedEvent),
      execute({
        event: BitcoinIndexerInitializedEvent,
        command: ({ payload }) =>
          this.blocksQueueService.startBlocksLoading(payload.height)
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinIndexerInitializedEvent> for event: ${error}`);
        return of();
      })
    );
  }

  @SyncSaga()
  onBitcoinIndexerReorganisationEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinIndexerReorganisationEvent),
      execute({
        event: BitcoinIndexerReorganisationEvent,
        command: ({ payload }) =>
          this.blocksQueueService.reorganizeBlocks(payload.height)
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinIndexerReorganisationEvent> for event: ${error}`);
        return of();
      })
    );
  }

  @SyncSaga()
  onBitcoinBlockIndexStartedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinBlockIndexStartedEvent),
      execute({
        event: BitcoinBlockIndexStartedEvent,
        command: ({ payload }) =>
          this.transactionsCommandFactoryService.indexTransactionsBatch({
            blockHeight: payload.aggregateId,
            block: payload.block,
            requestId: uuidv4()
          }),
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinBlockIndexStartedEvent> for event: ${error}`);
        return of();
      })
    );
  }

  @SyncSaga()
  onBitcoinIndexerIndexBlockConfirmedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinIndexerIndexBlockConfirmedEvent),
      execute({
        event: BitcoinIndexerIndexBlockConfirmedEvent,
        command: ({ payload }) =>
          // TODO: think do we need params block here?
          this.blocksQueueService.confirmIndexBlock()
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinIndexerIndexBlockConfirmedEvent> for event: ${error}`);
        return of();
      })
    );
  }

  @SyncSaga()
  onBitcoinBlockWithCompleteIndexedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinBlockWithCompleteIndexedEvent),
      execute({
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

  @SyncSaga()
  onBitcoinBlockBatchesUpdatedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinBlockBatchesUpdatedEvent),
      execute({
        event: BitcoinBlockBatchesUpdatedEvent,
        command: ({ payload }) =>
          this.transactionsCommandFactoryService.indexTransactionsBatch({
            // blockHash: payload.aggregateId, 
            // blockHeight: payload.height,
            block: payload.block,
            requestId: uuidv4()
          }),
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinBlockBatchesUpdatedEvent> for event: ${error}`);
        return of();
      })
    );
  }
}
