import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { IndexBlockCommand } from '@easylayer/domain-cqrs-components/bitcoin';
import { AppLogger } from '@easylayer/logger';
import {
  BitcoinNetworkProviderService,
} from '@easylayer/bitcoin-network-provider';
import { Block } from '../models/block.model';
import { Network } from '../models/network.model';
import { BitcoinBlockModelFactoryService, BitcoinNetworkModelFactoryService } from '../services';

@CommandHandler(IndexBlockCommand)
export class IndexBlockCommandHandler implements ICommandHandler<IndexBlockCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly modelFactory: BitcoinBlockModelFactoryService,
    private readonly networkModelFactory: BitcoinNetworkModelFactoryService,
    private readonly networkProviderService: BitcoinNetworkProviderService
  ) {}

  @Transactional({ connectionName: 'indexer-write' })
  async execute({ payload }: IndexBlockCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { block, requestId } = payload;

      const networkModel: Network = await this.networkModelFactory.initByExtraModel();
      await networkModel.addBlock({ block, requestId, service: this.networkProviderService });

      const aggregateId = networkModel.chain.lastBlockHash;
      const blockModel: Block = await this.modelFactory.initExistingModel(aggregateId);

      // Теперь мы индексируем блок который в состоянии network 
      // создаем паки транзакций 
      // сохраняем все в одну базу 
      // публикуем ивент Network про то что был блок или Добавлен или Реорганизация
      // публикуем Block который будем ловить рекурсией в Саге чтобы распарсить каждый пак транз

      // Check previous block hash
      // if (blockModel.block && blockModel.block.hash !== block.hash) {
      //   // If chain has been changed
      //   // we have to decrease currentHeight -1 into networkModel
      //   await networkModel.updateIndexedBlockHeight({ aggregateId: networkModel.aggregateId, height: 1n });
      //   return await networkModel.commit();
      // }

      // TODO: add validation and maybe transformation to block structure
      // remember if its validation rules = business rules then validation should be
      // inside aggregator method

      // const params = { aggregateId, block };
      // await blockModel.indexBlock(params);

      // if (indexedBlockFromHeigh) {
      //   await networkModel.updateIndexedBlockFromHeight({
      //     aggregateId: networkModel.aggregateId,
      //     height: indexedBlockFromHeigh,
      //   });
      // }

      // if (indexedBlockHeigh) {
      //   await networkModel.updateIndexedBlockHeight({
      //     aggregateId: networkModel.aggregateId,
      //     height: indexedBlockHeigh,
      //   });
      // }

      await networkModel.commit();
      await blockModel.commit();

      this.log.debug('Block index started', params, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
