import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SyncSaga, ICommand, ofType, execute } from '@easylayer/cqrs';
import {
  BitcoinTransactionsBatchWithIndexCreatedEvent,
  BitcoinTransactionsBatchIndexedEvent,
  BitcoinBalancesIndexerInitializedEvent
} from '@easylayer/domain-cqrs-components/bitcoin';
import { WalletsCommandFactoryService, SyncManagerService } from '../services';

@Injectable()
export class BalancesIndexerSaga {
  constructor(
    private readonly walletsCommandFactory: WalletsCommandFactoryService,
    private readonly syncManagerService: SyncManagerService,
  ) {}

  @SyncSaga()
  onBitcoinBalancesIndexerInitializedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinBalancesIndexerInitializedEvent),
      execute({
        event: BitcoinBalancesIndexerInitializedEvent,
        command: ({ payload }) =>
          this.syncManagerService.init(payload.blockHeight, payload.batchIndex)
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinBalancesIndexerInitializedEvent> for event: ${error}`);
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
          this.syncManagerService.processBatch({
            batchId: payload.aggregateId,
            transactions: payload.transactions,
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
          this.syncManagerService.processBatch({
            batchId: payload.aggregateId,
            transactions: payload.transactions,
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

  // @SyncSaga()
  // ontest(events$: Observable<any>): Observable<ICommand> {
  //   return events$.pipe(
  //     ofType(BitcoinBalancesIndexerInitializedEvent),
  //     execute({
  //       event: BitcoinBalancesIndexerInitializedEvent,
  //       command: ({ payload }) =>
  //         this.syncManagerService.reorganizeBlocks(payload.height, payload.batch)
  //     }),
  //     catchError((error) => {
  //       console.error(`Error handling <BitcoinBalancesIndexerInitializedEvent> for event: ${error}`);
  //       return of();
  //     })
  //   );
  // }

  // Тут события реорганизации

  // тут события про инициализацию про проиндексированну высоту блока. 
}
