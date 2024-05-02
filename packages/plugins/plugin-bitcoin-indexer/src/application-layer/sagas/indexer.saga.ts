// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SyncSaga, ICommand, ofType, execute } from '@easylayer/cqrs';
import { BitcoinNetworkInitializedEvent, } from '@easylayer/domain-cqrs-components';
// import { BitcoinBlocksCommandFactoryService } from '../services/blocks-command-factory.service';
import { BlocksQueueService } from '../blocks-queue/blocks-queue.service';

@Injectable()
export class IndexerSaga {
  constructor(
    // private readonly commandFactoryService: BitcoinBlocksCommandFactoryService,
    // private readonly eventFactoryService:
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

  // @SyncSaga()
  // onBlockIndexedSuccessEvent(events$: Observable<any>): Observable<ICommand> {
  //   return events$.pipe(
  //     ofType(BitcoinTransactionsPoolCreatedEvent), // shared event
  //     execute({
  //       event: BitcoinTransactionsPoolCreatedEvent,
  //       command: ({ payload }) =>
  //         this.commandFactoryService.completeIndexBlock({
  //           transactionsPoolId: payload.aggregateId,
  //           blockId: payload.blockId,
  //         }),
  //     }),
  //     catchError((error) => {
  //       console.error(`Error handling <BitcoinTransactionsPoolCreatedEvent> for event: ${error}`);
  //       return of();
  //     })
  //   );
  // }
}
