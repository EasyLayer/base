// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SyncSaga, ICommand, ofType, execute } from '@easylayer/cqrs';
import { BitcoinTransactionsPoolCreatedEvent } from '@easylayer/domain-cqrs-components';
import { BitcoinBlocksCommandFactoryService } from '../services/blocks-command-factory.service';

@Injectable()
export class BlocksSaga {
  constructor(
    private readonly commandFactoryService: BitcoinBlocksCommandFactoryService,
    // private readonly eventFactoryService:
    private readonly blocksManagerService: BlocksManagerService,
  ) {}

  @Saga()
  onAggregatesStartupedEvent(events$: Observable<any>): Observable<void> {
    return events$.pipe(
      ofType(AggregatesStartupedEvent),
      tap(event => {
        this.blocksManagerService.startProcessing(event.payload.currentBlock);
      })
    );
  }

  @SyncSaga()
  onBlockIndexedSuccessEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      ofType(BitcoinTransactionsPoolCreatedEvent), // shared event
      execute({
        event: BitcoinTransactionsPoolCreatedEvent,
        command: ({ payload }) =>
          this.commandFactoryService.completeIndexBlock({
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
}
