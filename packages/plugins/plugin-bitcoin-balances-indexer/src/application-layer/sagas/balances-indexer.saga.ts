import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SyncSaga, ICommand, ofType, execute } from '@easylayer/cqrs';
import {
  BitcoinTransactionsBatchWithIndexCreatedEvent,
  BitcoinTransactionsBatchIndexedEvent
} from '@easylayer/domain-cqrs-components/bitcoin';
import { WalletsCommandFactoryService } from '../services';

@Injectable()
export class BalancesIndexerSaga {
  constructor(
    private readonly walletsCommandFactory: WalletsCommandFactoryService
  ) {}

  @SyncSaga()
  onBitcoinTransactionsBatchWithIndexCreatedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinTransactionsBatchWithIndexCreatedEvent),
      execute({
        event: BitcoinTransactionsBatchWithIndexCreatedEvent,
        command: ({ payload }) =>
          this.walletsCommandFactory.index({ 
            batchId: payload.aggregateId,
            transactions: payload.transactions,
            blockHash: payload.blockHash,
            blockHeight: payload.blockHeight,
            requestId: uuidv4() })
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
          this.walletsCommandFactory.index({
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
}
