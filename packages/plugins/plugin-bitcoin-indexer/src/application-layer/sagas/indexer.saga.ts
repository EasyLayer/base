import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SyncSaga, ICommand, ofType, execute } from '@easylayer/cqrs';
import {
  BitcoinNetworkInitializedEvent,
  BitcoinBlockIndexStartedEvent,
  BitcoinNetworkIndexBlockConfirmedEvent,
  BitcoinBlockBatchesUpdatedEvent,
  BitcoinNetworkReorganisationEvent
} from '@easylayer/domain-cqrs-components/bitcoin';
import { BlocksCommandFactoryService, TransactionsCommandFactoryService } from '../services';
import { BlocksQueueService } from '../blocks-queue/blocks-queue.service';

@Injectable()
export class IndexerSaga {
  constructor(
    private readonly batchCommandFactoryService: TransactionsCommandFactoryService,
    private readonly blocksQueueService: BlocksQueueService,
  ) {}

  @SyncSaga()
  onBitcoinNetworkInitializedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinNetworkInitializedEvent),
      execute({
        event: BitcoinNetworkInitializedEvent,
        command: ({ payload }) =>
          this.blocksQueueService.startBlocksLoading(payload.height)
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinNetworkInitializedEvent> for event: ${error}`);
        return of();
      })
    );
  }

  @SyncSaga()
  onBitcoinNetworkReorganisationEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinNetworkReorganisationEvent),
      execute({
        event: BitcoinNetworkReorganisationEvent,
        command: ({ payload }) =>
          this.blocksQueueService.reorganizeBlocks(payload.block.height)
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinNetworkReorganisationEvent> for event: ${error}`);
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
          this.batchCommandFactoryService.indexTransactionsBatch({
            blockHeight: payload.aggregateId,
            block: payload.block,
            batches: payload.batches,
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
  onBitcoinNetworkIndexBlockConfirmedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinNetworkIndexBlockConfirmedEvent),
      execute({
        event: BitcoinNetworkIndexBlockConfirmedEvent,
        command: ({ payload }) =>
          // TODO: think do we need params block here?
          this.blocksQueueService.confirmProcessBlock()
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinNetworkIndexBlockConfirmedEvent> for event: ${error}`);
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
          this.batchCommandFactoryService.indexTransactionsBatch({
            blockHeight: payload.aggregateId,
            block: payload.block,
            batches: payload.batches,
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
