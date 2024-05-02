import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { InitNetworkCommand } from '@easylayer/domain-cqrs-components/bitcoin';
import { AppLogger } from '@easylayer/logger';
import { Network } from '../models/network.model';
import { BitcoinNetworkModelFactoryService, BitcoinBlockModelFactoryService } from '../services';

@CommandHandler(InitNetworkCommand)
export class InitNetworkCommandHandler implements ICommandHandler<InitNetworkCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly networkRepository: EventStoreRepository<Network>,
    private readonly networkModelFactory: BitcoinNetworkModelFactoryService,
    private readonly blocksModelFactory: BitcoinBlockModelFactoryService,
  ) {}

  @Transactional({ connectionName: 'indexer-write' })
  async execute({ payload }: InitNetworkCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { requestId } = payload;

      const networkModel: Network = await this.networkModelFactory.initByExtraModel();
      await networkModel.init({ requestId });

      if (networkModel.status === 'indexing') {
        // Publish last block event (if it exists)
        const blockAggregateId = String(networkModel.chain.lastBlockHeight);
        await this.blocksModelFactory.publishLastEvent(blockAggregateId);
      }

      await this.networkRepository.save(networkModel);
      await networkModel.commit();

      this.log.debug('Aggregates successfull init', {}, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
