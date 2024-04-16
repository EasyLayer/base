import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { InitBitcoinNetworkCommand } from '@easylayer/domain-cqrs-components';
import { AppLogger } from '@easylayer/logger';
import { Network } from '../models/network.model';
import { BitcoinNetworkModelFactoryService } from '../services/bitcoin-network-model-factory.service';

@CommandHandler(InitBitcoinNetworkCommand)
export class InitBitcoinNetworkCommandHandler implements ICommandHandler<InitBitcoinNetworkCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly modelFactory: BitcoinNetworkModelFactoryService
  ) {}

  async execute({ payload }: InitBitcoinNetworkCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { blockFromHeight, blockHeight } = payload;

      const networkModel: Network = await this.modelFactory.initModel(blockFromHeight, blockHeight);
      await networkModel.create({ aggregateId: networkModel.aggregateId });

      // Save into db
      // Before saving we will have to convert all bigints to strings
      // This should probably be done in the EventStore

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
