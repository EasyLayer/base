import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@easylayer/core/cqrs';
import { RuntimeTracker } from '@easylayer/components/logger';
import { BlocksQueueService } from '@easylayer/core/bitcoin-blocks-queue';
import { KeyManagementService, BitcoinNetworkProviderService } from '@easylayer/core/bitcoin-network-provider';
import { BitcoinListenerInitializedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-listener';
import { BusinessConfig } from '../../config/business.config';

@EventsHandler(BitcoinListenerInitializedEvent)
export class BitcoinListenerInitializedEventHandler implements IEventHandler<BitcoinListenerInitializedEvent> {
  constructor(
    private readonly businessConfig: BusinessConfig,
    private readonly keyManagementService: KeyManagementService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    @Inject('BlocksQueueService') private readonly blocksQueueService: BlocksQueueService
  ) {}

  @RuntimeTracker({ showMemory: true })
  async handle({ payload }: BitcoinListenerInitializedEvent) {
    try {
      const { restoreBlocks, indexedHeight } = payload;
      console.log(restoreBlocks);
      // Тут мы скорее всего должны что? пропущенные блоки восстановить и достать с них ивенты и сохранить в базу
      // А также опубликовать их.

      // IMPORTANT: We will only start loading to the blocks queue after the restoration of the Read State
      // TODO: move it from here
      this.blocksQueueService.start(indexedHeight);
    } catch (error) {
      throw error;
    }
  }
}
