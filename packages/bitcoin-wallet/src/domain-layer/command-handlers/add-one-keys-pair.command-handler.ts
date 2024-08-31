import { CommandHandler, ICommandHandler } from '@easylayer/core/cqrs';
import { Transactional, EventStoreRepository } from '@easylayer/core/eventstore';
import { AddKeysPairCommand } from '@easylayer/components/domain-cqrs-components/bitcoin-wallet';
import { WalletService } from '@easylayer/core/bitcoin-network-provider';
import { AppLogger, RuntimeTracker } from '@easylayer/components/logger';
import { Wallet } from '../models/wallet.model';
import { WalletModelFactoryService } from '../services';
import { KeysStorageRepositoryService } from '../../infrastructure-layer/services';

@CommandHandler(AddKeysPairCommand)
export class AddKeysPairCommandHandler implements ICommandHandler<AddKeysPairCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly eventStore: EventStoreRepository,
    private readonly walletModelFactory: WalletModelFactoryService,
    // private readonly networkProvider: BitcoinNetworkProviderService,
    private readonly walletService: WalletService,
    private readonly keysStorageRepository: KeysStorageRepositoryService
  ) {}

  @Transactional({ connectionName: 'wallet-eventstore' })
  @RuntimeTracker({ showMemory: true })
  async execute({ payload }: AddKeysPairCommand) {
    try {
      const { requestId, mnemonic, seed, privateKey } = payload;

      const walletModel: Wallet = await this.walletModelFactory.initModel();

      await walletModel.addOneKeysPair({
        requestId,
        mnemonic,
        seed,
        privateKey,
        walletService: this.walletService,
        keysStorageRepository: this.keysStorageRepository,
        logger: this.log,
      });

      await this.eventStore.save(walletModel);
      await walletModel.commit();
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
