// import { v4 as uuidv4 } from 'uuid';
import { Injectable, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
// import { catchError } from 'rxjs/operators';
import { Saga, ICommand, executeWithRetry } from '@easylayer/cqrs';
import { BlocksQueueService } from '@easylayer/bitcoin-blocks-queue';
import { BitcoinBalancesIndexerInitializedEvent } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import {
  BitcoinIndexerBlockIndexCompletedEvent,
  BitcoinIndexerBlockWithCompleteIndexedEvent,
  // BitcoinIndexerTransactionsBatchWithIndexCreatedEvent,
  // BitcoinIndexerTransactionsBatchIndexedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-indexer';

@Injectable()
export class IndexerSaga {
  constructor(@Inject('BlocksQueueService') private readonly blocksQueueService: BlocksQueueService) {}

  @Saga()
  onBitcoinBalancesIndexerInitializedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinBalancesIndexerInitializedEvent,
        command: ({ payload }: BitcoinBalancesIndexerInitializedEvent) =>
          this.blocksQueueService.start(payload.indexedHeight),
      })
    );
  }

  @Saga()
  onBitcoinIndexerBlockWithCompleteIndexedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerBlockWithCompleteIndexedEvent,
        command: ({ payload }: BitcoinIndexerBlockWithCompleteIndexedEvent) =>
          new Promise((resolve) => {
            this.blocksQueueService.blocksCollector.addBlock(payload.block, payload.txCount);
            resolve();
          }),
      })
    );
  }

  @Saga()
  onBitcoinIndexerBlockIndexCompletedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerBlockIndexCompletedEvent,
        command: ({ payload }: BitcoinIndexerBlockIndexCompletedEvent) =>
          new Promise((resolve) => {
            this.blocksQueueService.blocksCollector.addBlock(payload.block, payload.txCount);
            resolve();
          }),
      })
    );
  }

  // @Saga()
  // onBitcoinIndexerTransactionsBatchWithIndexCreatedEvent(events$: Observable<any>): Observable<ICommand> {
  //   return events$.pipe(
  //     executeWithRetry({
  //       event: BitcoinIndexerTransactionsBatchWithIndexCreatedEvent,
  //       command: ({ payload }: BitcoinIndexerTransactionsBatchWithIndexCreatedEvent) =>
  //         new Promise((resolve, reject) => {
  //           this.blocksQueueService.blocksCollector.addTransactions({
  //             blockHash: payload.blockHash,
  //             blockHeight: BigInt(payload.blockHeight),
  //             tx: payload.batch.transactions,
  //             index: payload.batch.index,
  //             isFinalbatch:
  //           });
  //           resolve();
  //         })
  //     }),
  //   );
  // }

  // @Saga()
  // onBitcoinIndexerTransactionsBatchIndexedEvent(events$: Observable<any>): Observable<ICommand> {
  //   return events$.pipe(
  //     executeWithRetry({
  //       event: BitcoinIndexerTransactionsBatchIndexedEvent,
  //       command: ({ payload }: BitcoinIndexerTransactionsBatchIndexedEvent) =>
  //         new Promise((resolve, reject) => {
  //           this.blocksQueueService.blocksCollector.addTransactions({
  //             blockHash: payload.blockHash,
  //             blockHeight: BigInt(payload.blockHeight),
  //             tx: payload.batch.transactions,
  //             index: payload.batch.index,
  //             isFinalbatch:
  //           });
  //           resolve();
  //         })
  //     }),
  //   );
  // }
}
