import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { CompleteIndexBitcoinBlockCommand } from '@easylayer/domain-cqrs-components';
import { AppLogger } from '@easylayer/logger';
import { Block } from '../models/block.model';
import { Network } from '../models/network.model';
import { BitcoinBlockModelFactoryService, BitcoinNetworkModelFactoryService } from '../services';

@CommandHandler(CompleteIndexBitcoinBlockCommand)
export class CompleteIndexBitcoinBlockCommandHandler implements ICommandHandler<CompleteIndexBitcoinBlockCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly eventStore: EventStoreRepository,
    private readonly modelFactory: BitcoinBlockModelFactoryService,
    private readonly networkModelFactory: BitcoinNetworkModelFactoryService
  ) {}

  @Transactional({ connectionName: 'blocks-write' })
  async execute({ payload }: CompleteIndexBitcoinBlockCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { transactionsPoolId, blockId } = payload;

      const blockModel: Block = await this.modelFactory.initExistingModel(blockId);

      const networkModel: Network = await this.networkModelFactory.initModel();

      const params = { aggregateId: blockId, transactionsPoolId };
      await blockModel.completeIndexBlock(params);

      await this.eventStore.save([networkModel, blockModel]);

      await networkModel.commit(true);
      await blockModel.commit();

      this.log.debug('Block successfull indexed', params, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
