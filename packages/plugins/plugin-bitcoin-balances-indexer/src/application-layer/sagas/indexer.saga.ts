import { Injectable, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Saga, ICommand, executeWithRetry } from '@easylayer/cqrs';
import {
  BitcoinBalancesIndexerInitializedEvent,
  BitcoinBalancesIndexerReorganisationStartedEvent,
  BitcoinBalancesIndexerReorganisationFinishedEvent,
  BitcoinBalancesIndexerChainByBlockTruncatedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { IndexerCommandFactoryService } from '../services';

@Injectable()
export class IndexerSaga {
  constructor(
    @Inject('TransactionsQueueService') private readonly transactionsQueueService: any,
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

  // При старте реорганизации запускаем команду обработки реорганизации
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

  // На окончание реорганзиции мы вызываем метод очереди чтобы очистить очередь и отпустить итератор
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
}
