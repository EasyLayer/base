import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SyncSaga, ICommand, ofType, execute } from '@easylayer/cqrs';
import {
  BitcoinTransactionsBatchWithIndexCreatedEvent,
  BitcoinTransactionsBatchIndexedEvent,
  BitcoinBalancesIndexerInitializedEvent,
  BitcoiBalancesIndexerReorganisationEvent,
  BitcoinBalancesIndexerSynchronisationEvent
} from '@easylayer/domain-cqrs-components/bitcoin';
import { WalletsBatchCommandFactoryService, SyncManagerService } from '../services';

@Injectable()
export class BalancesIndexerSaga {
  constructor(
    private readonly syncManagerService: SyncManagerService,
    private readonly walletsBatchCommandFactory: WalletsBatchCommandFactoryService
  ) {}

  @SyncSaga()
  onBitcoinBalancesIndexerInitializedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinBalancesIndexerInitializedEvent),
      execute({
        event: BitcoinBalancesIndexerInitializedEvent,
        command: ({ payload }) =>
          this.syncManagerService.sync({
            indexedBlockHeight: payload.blockHeight,
            indexedBatchIndex: payload.batchIndex,
            requestId: uuidv4()
          })
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinBalancesIndexerInitializedEvent> for event: ${error}`);
        return of();
      })
    );
  }

  @SyncSaga()
  onBitcoiBalancesIndexerReorganisationEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoiBalancesIndexerReorganisationEvent),
      execute({
        event: BitcoiBalancesIndexerReorganisationEvent,
        command: ({ payload }) =>
          this.walletsBatchCommandFactory.rollback({
            batches: payload.blockBatches,
            blockHeight: payload.blockHeight,
            blockHash: payload.blockHash,
            reorganisationHeight: payload.reorganisationHeight,
            requestId: uuidv4()
          })
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoiBalancesIndexerReorganisationEvent> for event: ${error}`);
        return of();
      })
    );
  }

  @SyncSaga()
  onBitcoinBalancesIndexerSynchronisationEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinBalancesIndexerSynchronisationEvent),
      execute({
        event: BitcoinBalancesIndexerSynchronisationEvent,
        command: ({ payload }) =>
          this.syncManagerService.sync({
            indexedBlockHeight: payload.blockHeight,
            indexedBatchIndex: payload.batchIndex,
            requestId: uuidv4()
          })
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinBalancesIndexerSynchronisationEvent> for event: ${error}`);
        return of();
      })
    );
  }

  @SyncSaga()
  onBitcoinTransactionsBatchWithIndexCreatedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinTransactionsBatchWithIndexCreatedEvent),
      execute({
        event: BitcoinTransactionsBatchWithIndexCreatedEvent,
        command: ({ payload }) =>
          this.syncManagerService.onTransactionsBatch({
            batch: payload.batch,
            blockHash: payload.blockHash,
            blockHeight: payload.blockHeight,
            requestId: uuidv4()
          })
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinTransactionsBatchWithIndexCreatedEvent> for event: ${error}`);
        return of();
      })
    );
  }

  @SyncSaga()
  onBitcoinTransactionsBatchIndexedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinTransactionsBatchIndexedEvent),
      execute({
        event: BitcoinTransactionsBatchIndexedEvent,
        command: ({ payload }) =>
          this.syncManagerService.onTransactionsBatch({
            batch: payload.batch,
            blockHash: payload.blockHash,
            blockHeight: payload.blockHeight,
            requestId: uuidv4()
          })
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinTransactionsBatchIndexedEvent> for event: ${error}`);
        return of();
      })
    );
  }
}
