// import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { InitBalancesIndexerCommand } from '@easylayer/domain-cqrs-components/bitcoin';
import { AppLogger } from '@easylayer/logger';
import { BalancesIndexer } from '../models/balances-indexer.model';
import { BalancesIndexerModelFactoryService } from '../services';

@CommandHandler(InitBalancesIndexerCommand)
export class InitBalancesIndexerCommandHandler implements ICommandHandler<InitBalancesIndexerCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly eventStore: EventStoreRepository,
    private readonly balancesIndexerModelFactory: BalancesIndexerModelFactoryService,
  ) {}

  @Transactional({ connectionName: 'balances-indexer-write' })
  async execute({ payload }: InitBalancesIndexerCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { requestId } = payload;

      const indexerModel: BalancesIndexer = await this.balancesIndexerModelFactory.initModel();
      await indexerModel.init();

      // Какие статусы будут у этого аггрегата? 
      // - реорганизация точно , возможно и индексирование тоже добавить можно
      
      // Реорганизация может запуститься когда пришел ивент что индексер реорганизуеться? 
      // пока балансы не придут в норму, я не должен реагировать на любые события, 
      // это означает что мы должна закрыть статусом саги, назвать статус какой то "догоняем"
      // Мы можем убрать нахер push?? В чем проблема? - в том что нас постоянно будет спамить ивентами в Сагах, 
      // каждый раз нам придеться доставать состояние, чтобы сказать что не торопись, мы тут заняты другими вещами. 

      // Еще можно подумать над тем чтобы толкьо на некоторые события подписаться, не на все напрмиер, 
      // Может только на новый блок или что то такое

      // if (indexerModel.status === 'indexing') {
      //   // Publish last block event (if it exists)
      //   const blockAggregateId = String(networkModel.chain.lastBlockHeight);
      //   await this.blocksModelFactory.publishLastEvent(blockAggregateId);
      // }

      // if (indexerModel.status === 'reorganisation') {
      //   // Publish last network event to process reorganisation
      //   await this.balancesIndexerModelFactory.publishLastEvent();
      // }

      await this.eventStore.save(indexerModel);
      await indexerModel.commit();

      this.log.debug('Aggregates successfull init', {}, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
