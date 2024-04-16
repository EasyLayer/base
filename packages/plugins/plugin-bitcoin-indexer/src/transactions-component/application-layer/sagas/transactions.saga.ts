// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SyncSaga, ICommand, ofType, execute } from '@easylayer/cqrs';
import {
  BitcoinBlockIndexedEvent,
  BitcoinTransactionsPoolCreatedEvent,
  BitcoinTransactionsPoolUpdatedEvent,
} from '@easylayer/domain-cqrs-components';
import { BitcoinTransactionsCommandFactoryService } from '../services/transactions-command-factory.service';

@Injectable()
export class TransactionsSaga {
  constructor(
    private readonly commandFactoryService: BitcoinTransactionsCommandFactoryService
    // private readonly eventFactoryService:
  ) {}

  @SyncSaga()
  onBlockIndexedSuccessEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinBlockIndexedEvent), // shared event
      execute({
        event: BitcoinBlockIndexedEvent,
        command: ({ payload }) =>
          this.commandFactoryService.createTransactionsPool({
            blockId: payload.aggregateId,
          }),
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinBlockIndexedEvent> for event: ${error}`);
        return of();
      })
    );
  }

  @SyncSaga()
  onTransactionsPoolCreatedSuccessEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinTransactionsPoolCreatedEvent), // shared event
      execute({
        event: BitcoinTransactionsPoolCreatedEvent,
        command: ({ payload }) =>
          this.commandFactoryService.indexTransactionsBatch({
            transactionsPoolId: payload.aggregateId,
            blockId: payload.blockId,
          }),
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinTransactionsPoolCreatedEvent> for event: ${error}`);
        return of();
      })
    );
  }

  @SyncSaga()
  onTransactionsPoolUpdatedSuccessEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinTransactionsPoolUpdatedEvent), // shared event
      execute({
        event: BitcoinTransactionsPoolUpdatedEvent,
        command: ({ payload }) =>
          this.commandFactoryService.indexTransactionsBatch({
            transactionsPoolId: payload.aggregateId,
            blockId: payload.blockId,
          }),
      }),
      catchError((error) => {
        console.error(`Error handling <BitcoinTransactionsPoolUpdatedEvent> for event: ${error}`);
        return of();
      })
    );
  }
}
