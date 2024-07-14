import { Injectable, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Saga, ICommand, executeWithRetry } from '@easylayer/cqrs';
import { TransactionsQueueService } from '@easylayer/bitcoin-transactions-queue';
import {
  BitcoinBalancesIndexerInitializedEvent,
  BitcoinBalancesIndexerReorganisationStartedEvent,
  BitcoinBalancesIndexerReorganisationFinishedEvent,
  BitcoinBalancesIndexerChainByBlockTruncatedEvent,
  BitcoinBalancesIndexerChainBacthAddedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { BitcoinIndexerTransactionsBatchIndexedEvent } from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { IndexerCommandFactoryService } from '../services';

@Injectable()
export class IndexerSaga {
  constructor(
    @Inject('TransactionsQueueService') private readonly transactionsQueueService: TransactionsQueueService,
    private readonly indexerCommandFactory: IndexerCommandFactoryService
  ) {}

  @Saga()
  onBitcoinBalancesIndexerInitializedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinBalancesIndexerInitializedEvent,
        command: ({ payload }: BitcoinBalancesIndexerInitializedEvent) =>
          this.transactionsQueueService.start(payload.indexedHeight),
      })
    );
  }

  @Saga()
  onBitcoinBalancesIndexerReorganisationStartedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinBalancesIndexerReorganisationStartedEvent,
        command: ({ payload }: BitcoinBalancesIndexerReorganisationStartedEvent) =>
          this.indexerCommandFactory.processReorganisation(payload),
      })
    );
  }

  @Saga()
  onBitcoinBalancesIndexerReorganisationFinishedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinBalancesIndexerReorganisationFinishedEvent,
        command: ({ payload }: BitcoinBalancesIndexerReorganisationFinishedEvent) =>
          this.transactionsQueueService.reorganizeBatches(payload.height),
      })
    );
  }

  @Saga()
  onBitcoinBalancesIndexerChainByBlockTruncatedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinBalancesIndexerChainByBlockTruncatedEvent,
        command: ({ payload }: BitcoinBalancesIndexerChainByBlockTruncatedEvent) =>
          this.indexerCommandFactory.processReorganisation(payload),
      })
    );
  }

  @Saga()
  onBitcoinIndexerTransactionsBatchIndexedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinIndexerTransactionsBatchIndexedEvent,
        command: ({ payload }: BitcoinIndexerTransactionsBatchIndexedEvent) => {
          return new Promise<void>((resolve) => {
            this.transactionsQueueService.batchesCollector.addBatch(payload.batch);
            resolve();
          });
        },
      })
    );
  }

  @Saga()
  onBitcoinBalancesIndexerChainBacthAddedEvent(events$: Observable<any>): Observable<ICommand> {
    return events$.pipe(
      executeWithRetry({
        event: BitcoinBalancesIndexerChainBacthAddedEvent,
        command: ({ payload }) =>
          this.transactionsQueueService.confirmIndexBatch({
            n: payload.batch.n,
            blockHash: payload.blockHash,
            blockHeight: payload.blockHeight,
            prevBlockHash: payload.prevBlockHash,
          }),
      })
    );
  }
}
