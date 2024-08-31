import { CommandHandler, ICommandHandler } from '@easylayer/core/cqrs';
import { Transactional, EventStoreRepository } from '@easylayer/core/eventstore';
import { InitListenerCommand } from '@easylayer/components/domain-cqrs-components/bitcoin-listener';
import { AppLogger, RuntimeTracker } from '@easylayer/components/logger';
import { Listener } from '../models/listener.model';
import { ListenerModelFactoryService } from '../services';

@CommandHandler(InitListenerCommand)
export class InitListenerCommandHandler implements ICommandHandler<InitListenerCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly eventStore: EventStoreRepository,
    private readonly listenerModelFactory: ListenerModelFactoryService
  ) {}

  @Transactional({ connectionName: 'listener-eventstore' })
  @RuntimeTracker({ showMemory: true })
  async execute({ payload }: InitListenerCommand) {
    try {
      const { requestId, startHeight, lastReadStateHeight } = payload;

      const restoreBlocks: string[] = [];

      this.log.info('Init Listener Aggregate...', null, this.constructor.name);

      const listenerModel: Listener = await this.listenerModelFactory.initModel();

      this.log.info('Listener Aggregate successfully initialized.', null, this.constructor.name);

      if (listenerModel.status === 'awaiting' && lastReadStateHeight !== undefined) {
        const restoreBlocksCount = listenerModel.chain.lastBlockHeight - lastReadStateHeight;

        this.log.info(
          'Synchronization of blocks between write and read states starting...',
          { restoreBlocksCount },
          this.constructor.name
        );

        // NOTE: We want to restore events one block more than the difference between write and read state.
        const blocks = listenerModel.chain.getLastNBlocks(restoreBlocksCount + 1);

        this.log.info(
          'Synchronization of blocks between write and read states was finished',
          null,
          this.constructor.name
        );

        // For restore block in read state we publish indexer with blocks hashes
        blocks.forEach((item) => restoreBlocks.push(item.hash));
      }

      if (listenerModel.status === 'reorganisation') {
        this.log.info('Reorganisation of blocks was started...', null, this.constructor.name);
        // Publish last indexer event to process reorganisation
        await this.listenerModelFactory.publishLastEvent();

        this.log.info('Reorganisation of blocks was finished.', null, this.constructor.name);
      }

      await listenerModel.init({
        requestId,
        startHeight,
        restoreBlocks,
      });

      await this.eventStore.save(listenerModel);
      await listenerModel.commit();

      this.log.info('Aggregates successfull init', null, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
