import { AggregateRoot } from '@easylayer/core/cqrs';
import { WalletService } from '@easylayer/core/bitcoin-network-provider';
import { AppLogger } from '@easylayer/components/logger';
import {
  BitcoinWalletInitializedEvent,
  BitcoinKeysPairAddedEvent,
} from '@easylayer/components/domain-cqrs-components/bitcoin-wallet';
import { KeysStorageRepositoryService } from '../../infrastructure-layer/services';

export class Wallet extends AggregateRoot {
  public aggregateId: string = 'wallet';
  public publicKeyHashes: string[] = [];

  public async init({ requestId }: { requestId: string }) {
    const publicKeyHashes: string[] = [];

    await this.apply(
      new BitcoinWalletInitializedEvent({
        aggregateId: this.aggregateId,
        requestId,
        publicKeyHashes,
      })
    );
  }

  public async addOneKeysPair({
    requestId,
    mnemonic,
    seed,
    privateKey,
    keysStorageRepository,
    walletService,
    logger,
  }: {
    requestId: string;
    mnemonic?: string;
    seed?: string | Buffer;
    privateKey?: string | Buffer;
    keysStorageRepository: KeysStorageRepositoryService;
    walletService: WalletService;
    logger: AppLogger;
  }) {
    if (!mnemonic && !seed && !privateKey) {
      throw new Error('At least one of mnemonic, seed, or privateKey must be provided.');
    }

    const keypair: {
      mnemonic?: string;
      seed?: Buffer;
      privateKey?: Buffer;
      publicKey?: Buffer;
    } = {
      mnemonic,
      seed: seed instanceof Buffer ? seed : undefined,
      privateKey: privateKey instanceof Buffer ? privateKey : undefined,
    };

    if (mnemonic) {
      keypair.seed = walletService.seedFromMnemonic(mnemonic);
      const masterKeys = await walletService.masterKeyFromSeed(keypair.seed); // TODO: add network
      keypair.privateKey = masterKeys.privateKey;
      keypair.publicKey = masterKeys.publicKey;
    } else if (seed) {
      const seedBuffer = seed instanceof Buffer ? seed : Buffer.from(seed, 'hex');
      const masterKeys = await walletService.masterKeyFromSeed(seedBuffer); // TODO: add network
      keypair.privateKey = masterKeys.privateKey;
      keypair.publicKey = masterKeys.publicKey;
    } else {
      keypair.privateKey = privateKey instanceof Buffer ? privateKey : Buffer.from(privateKey!, 'hex');
      keypair.publicKey = await walletService.publicKeyFromPrivateKey(keypair.privateKey.toString('hex'));
    }

    if (!keypair.publicKey) {
      throw new Error('Failed to generate public key.');
    }

    const publicKeyHash = walletService.hashPublicKey(keypair.publicKey);

    await keysStorageRepository.add({
      public_key_hash: publicKeyHash,
      private_key: keypair.privateKey!.toString('hex'),
      seed: keypair.seed ? keypair.seed.toString('hex') : null,
      mnemonic: keypair.mnemonic || null,
    });

    await this.apply(
      new BitcoinKeysPairAddedEvent({
        aggregateId: this.aggregateId,
        requestId,
        publicKeyHash,
      })
    );

    logger.info('Keys Pair successfull added', { publicKeyHash }, this.constructor.name);
  }

  private onBitcoinWalletInitializedEvent({ payload }: BitcoinWalletInitializedEvent) {
    const { publicKeyHashes } = payload;
    this.publicKeyHashes = publicKeyHashes;
  }

  private onBitcoinKeysPairAddedEvent({ payload }: BitcoinKeysPairAddedEvent) {
    const { publicKeyHash } = payload;
    this.publicKeyHashes.push(publicKeyHash);
  }
}
