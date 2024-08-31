// import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/core/cqrs';
import { Transactional, EventStoreRepository } from '@easylayer/core/eventstore';
import { HandleBlocksBatchCommand } from '@easylayer/components/domain-cqrs-components/bitcoin-listener';
import { AppLogger, RuntimeTracker } from '@easylayer/components/logger';
import { BitcoinNetworkProviderService } from '@easylayer/core/bitcoin-network-provider';
import { Listener } from '../models/listener.model';
import { ListenerModelFactoryService } from '../services';

@CommandHandler(HandleBlocksBatchCommand)
export class HandleBlocksBatchCommandHandler implements ICommandHandler<HandleBlocksBatchCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly listenerModelFactory: ListenerModelFactoryService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    private readonly eventStore: EventStoreRepository
  ) {}

  @Transactional({ connectionName: 'listener-eventstore' })
  @RuntimeTracker({ showMemory: true })
  async execute({ payload }: HandleBlocksBatchCommand) {
    try {
      const { batch, requestId } = payload;

      const listenerModel: Listener = await this.listenerModelFactory.initModel();

      await listenerModel.addBlocks({
        requestId,
        blocks: batch,
        service: this.networkProviderService,
        logger: this.log,
      });

      await this.eventStore.save(listenerModel);

      this.listenerModelFactory.updateCache(listenerModel);

      await listenerModel.commit();
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      this.listenerModelFactory.clearCache();
      throw error;
    }
  }
}
