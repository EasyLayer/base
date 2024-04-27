import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { IndexBitcoinBlockCommand } from '@easylayer/domain-cqrs-components';
import { AppLogger } from '@easylayer/logger';
import { Block } from '../models/block.model';
import { Network } from '../models/network.model';
import { BitcoinBlockModelFactoryService, BitcoinNetworkModelFactoryService } from '../services';

@CommandHandler(IndexBitcoinBlockCommand)
export class IndexBitcoinBlockCommandHandler implements ICommandHandler<IndexBitcoinBlockCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly modelFactory: BitcoinBlockModelFactoryService,
    private readonly networkModelFactory: BitcoinNetworkModelFactoryService
  ) {}

  @Transactional({ connectionName: 'blocks-write' })
  async execute({ payload }: IndexBitcoinBlockCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { block, indexedBlockFromHeigh, indexedBlockHeigh } = payload;
      const aggregateId = block.hash;

      const blockModel: Block = await this.modelFactory.initExistingModel(aggregateId);

      // TODO: Consider the option when we update the network only when the block has received the "indexed" status
      const networkModel: Network = await this.networkModelFactory.initModel();

      // Check previous block hash
      if (blockModel.block && blockModel.block.hash !== block.hash) {
        // If chain has been changed
        // we have to decrease currentHeight -1 into networkModel
        await networkModel.updateIndexedBlockHeight({ aggregateId: networkModel.aggregateId, height: 1n });
        return await networkModel.commit();
      }

      // TODO: add validation and maybe transformation to block structure
      // remember if its validation rules = business rules then validation should be
      // inside aggregator method

      const params = { aggregateId, block };
      await blockModel.indexBlock(params);

      if (indexedBlockFromHeigh) {
        await networkModel.updateIndexedBlockFromHeight({
          aggregateId: networkModel.aggregateId,
          height: indexedBlockFromHeigh,
        });
      }

      if (indexedBlockHeigh) {
        await networkModel.updateIndexedBlockHeight({
          aggregateId: networkModel.aggregateId,
          height: indexedBlockHeigh,
        });
      }

      // IMPORTANT: We can have 2 commits only in case when one of them don't publish events
      await blockModel.commit();
      await networkModel.commit(true);

      this.log.debug('Block index started', params, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
