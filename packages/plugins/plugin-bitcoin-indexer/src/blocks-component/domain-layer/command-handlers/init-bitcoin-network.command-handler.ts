import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { InitBitcoinNetworkCommand } from '@easylayer/domain-cqrs-components';
import { AppLogger } from '@easylayer/logger';
import { Network } from '../models/network.model';
import { BitcoinNetworkModelFactoryService } from '../services/bitcoin-network-model-factory.service';

@CommandHandler(InitBitcoinNetworkCommand)
export class InitBitcoinNetworkCommandHandler implements ICommandHandler<InitBitcoinNetworkCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly networkRepository: EventStoreRepository<Network>,
    private readonly modelFactory: BitcoinNetworkModelFactoryService
  ) {}

  @Transactional({ connectionName: 'blocks-write' })
  async execute({ payload }: InitBitcoinNetworkCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { uuid, blockFromHeight, blockHeight } = payload;

      const params = { aggregateId: uuid, blockFromHeight, blockHeight }
      const networkModel: Network = await this.modelFactory.initModel();

      if (!networkModel.aggregateId) {
        await networkModel.create({ aggregateId: networkModel.aggregateId });

        // Save into db
        // Before saving we will have to convert all bigints to strings
        // This should probably be done in the EventStore
        await this.networkRepository.save(networkModel);
      }

      await networkModel.commit(true);

      this.log.debug('Network successfull init', {}, this.constructor.name);

      return {
        indexedBlockFromHeight: networkModel.indexedBlockFromHeight,
        indexedBlockHeight: networkModel.indexedBlockHeight,
      };
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
