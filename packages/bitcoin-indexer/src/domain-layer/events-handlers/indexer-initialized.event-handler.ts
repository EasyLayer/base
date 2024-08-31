import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@easylayer/core/cqrs';
import { RuntimeTracker } from '@easylayer/components/logger';
import { BlocksQueueService } from '@easylayer/core/bitcoin-blocks-queue';
import { KeyManagementService, BitcoinNetworkProviderService } from '@easylayer/core/bitcoin-network-provider';
import { BitcoinIndexerInitializedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-indexer';
import { BusinessConfig } from '../../config/business.config';

@EventsHandler(BitcoinIndexerInitializedEvent)
export class BitcoinIndexerInitializedEventHandler implements IEventHandler<BitcoinIndexerInitializedEvent> {
  constructor(
    private readonly businessConfig: BusinessConfig,
    private readonly keyManagementService: KeyManagementService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    @Inject('BlocksQueueService') private readonly blocksQueueService: BlocksQueueService
  ) {}

  // @Transactional({ connectionName: 'balances-indexer-views' })
  @RuntimeTracker({ showMemory: true })
  async handle({ payload }: BitcoinIndexerInitializedEvent) {
    try {
      const { restoreBlocks, indexedHeight } = payload;
      console.log(restoreBlocks);
      // IMPORTANT: We will only start loading to the blocks queue after the restoration of the Read State
      // TODO: move it from here
      this.blocksQueueService.start(indexedHeight);
    } catch (error) {
      throw error;
    }
  }
}
