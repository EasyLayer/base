import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinWalletsBatchBalancesIndexedEvent,
  BitcoinWalletsBatchBalancesRolledbackEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';

export enum OutputTypes {
  NATIVE = 'NATIVE',
  NFT = 'NFT',
  RUNE = 'RUNE'
}

class Rune {
  constructor(
    public readonly type: string,
    public readonly value: number
  ) {}
}

type Runes = Map<string, Rune>;

class NFT {
  constructor(
    public readonly name: string,
    public readonly metadata: any
  ) {}
}
type NFTs = Map<string, NFT>;

class NativeCoin {
  constructor(
    public readonly amount: bigint
  ) {}
}
type NativeCoins = Map<string, NativeCoin>; // Ключ будет publicKey:address

type Wallets = Map<string, { nativeCoins: NativeCoins, nfts: NFTs, runes: Runes }>;

// В этом батче я уже посчитаю балансы для каждого кошелька тут
export class WalletsBatch extends AggregateRoot {
  public aggregateId!: string; // ??? может сделать тем же самым что и transactionBatch
  public wallets: Wallets = new Map();

  public async index({
    aggregateId,
    requestId,
    outputs
  }: {
    aggregateId: string;
    requestId: string;
    outputs: any[]; // TODO: add type
  }) {
    this.aggregateId = aggregateId;

    // Определить тип выходов
    const transactionType = this.determineTransactionType(outputs);
    if (!transactionType) {
      // Если такой тип выходов не поддерживается, пропускаем
      return;
    }

    // Структурировать данные и провести проверки
    const structuredOutputs = this.structureOutputs(transactionType, outputs);

    // Опубликовать событие с новыми выходами
    await this.apply(new BitcoinWalletsBatchBalancesIndexedEvent({ aggregateId, requestId, balances: structuredOutputs }));
  }

  public async rollback({
    aggregateId,
    requestId,
    outputs
  }: {
    aggregateId: string;
    requestId: string;
    outputs: any[]; // TODO: add type
  }) {
    this.aggregateId = aggregateId;

    // Инвертировать значения для отката
    const invertedOutputs = outputs.map(output => ({
      ...output,
      amount: output.amount ? -output.amount : output.amount,
      value: output.value ? -output.value : output.value
    }));

    // Определить тип выходов
    const transactionType = this.determineTransactionType(invertedOutputs);
    if (!transactionType) {
      // Если такой тип выходов не поддерживается, пропускаем
      return;
    }

    // Структурировать данные и провести проверки
    const structuredOutputs = this.structureOutputs(transactionType, invertedOutputs);

    // Опубликовать событие с новыми выходами
    await this.apply(new BitcoinWalletsBatchBalancesRolledbackEvent({ aggregateId, requestId, balances: structuredOutputs }));
  }

  private onBitcoinWalletsBatchBalancesIndexedEvent({ payload }: BitcoinWalletsBatchBalancesIndexedEvent) {
    const { aggregateId, outputs } = payload;
    this.aggregateId = aggregateId;

    // Обновляем состояние кошельков на основе новых выходов
    this.updateWallets(outputs);
  }

  private onBitcoinWalletsBatchBalancesRolledbackEvent({ payload }: BitcoinWalletsBatchBalancesRolledbackEvent) {
    const { aggregateId, outputs } = payload;
    this.aggregateId = aggregateId;

    // Откатываем состояние кошельков на основе новых выходов
    this.rollbackWallets(outputs);
  }

  private structureOutputs(transactionType: OutputTypes, outputs: any[]): Wallets {
    switch (transactionType) {
      case OutputTypes.NATIVE:
        return this.structureNativeCoins(outputs);
      case OutputTypes.NFT:
        return this.structureNFTs(outputs);
      case OutputTypes.RUNE:
        return this.structureRunes(outputs);
      default:
        return new Map();
    }
  }

  private structureNativeCoins(outputs: any[]): Wallets {
    const grouped: Wallets = new Map();

    for (const output of outputs) {
      const { address, amount, publicKey } = output;
      const key = `${publicKey}:${address}`;

      if (typeof address !== 'string' || typeof publicKey !== 'string' || !amount) {
        // Если выход не соответствует ожидаемым типам данных, пропускаем его
        continue;
      }

      if (!grouped.has(key)) {
        grouped.set(key, { nativeCoins: new Map(), nfts: new Map(), runes: new Map() });
      }
      const wallet = grouped.get(key)!;
      if (wallet.nativeCoins.has(address)) {
        const coin = wallet.nativeCoins.get(address)!;
        wallet.nativeCoins.set(address, new NativeCoin(coin.amount + BigInt(amount)));
      } else {
        wallet.nativeCoins.set(address, new NativeCoin(BigInt(amount)));
      }
    }

    return grouped;
  }

  private structureNFTs(outputs: any[]): Wallets {
    const grouped: Wallets = new Map();

    for (const output of outputs) {
      const { tokenId, name, metadata, publicKey, address } = output;
      const key = `${publicKey}:${address}`;

      if (typeof tokenId !== 'string' || typeof publicKey !== 'string' || typeof address !== 'string') {
        // Если выход не соответствует ожидаемым типам данных, пропускаем его
        continue;
      }

      if (!grouped.has(key)) {
        grouped.set(key, { nativeCoins: new Map(), nfts: new Map(), runes: new Map() });
      }
      const wallet = grouped.get(key)!;
      wallet.nfts.set(tokenId, new NFT(name, metadata));
    }

    return grouped;
  }

  private structureRunes(outputs: any[]): Wallets {
    const grouped: Wallets = new Map();

    for (const output of outputs) {
      const { type, value, publicKey, address } = output;
      const key = `${publicKey}:${address}`;

      if (typeof type !== 'string' || typeof publicKey !== 'string' || typeof address !== 'string' || !value) {
        // Если выход не соответствует ожидаемым типам данных, пропускаем его
        continue;
      }

      if (!grouped.has(key)) {
        grouped.set(key, { nativeCoins: new Map(), nfts: new Map(), runes: new Map() });
      }
      const wallet = grouped.get(key)!;
      if (wallet.runes.has(type)) {
        const rune = wallet.runes.get(type)!;
        wallet.runes.set(type, new Rune(type, rune.value + value));
      } else {
        wallet.runes.set(type, new Rune(type, value));
      }
    }

    return grouped;
  }

  // TODO: move to Provider package
  private determineTransactionType(outputs: any[]): OutputTypes | undefined {
    if (outputs.some(output => output.tokenType === 'rune')) {
      return OutputTypes.RUNE;
    } else if (outputs.some(output => output.contractAddress && output.tokenId)) {
      return OutputTypes.NFT;
    } else if (outputs.some(output => output.amount && output.address)) {
      return OutputTypes.NATIVE;
    }
    return undefined;
  }

  private updateWallets(newOutputs: Wallets) {
    newOutputs.forEach((walletData, key) => {
      if (!this.wallets.has(key)) {
        this.wallets.set(key, { nativeCoins: new Map(), nfts: new Map(), runes: new Map() });
      }
      const wallet = this.wallets.get(key)!;

      walletData.nativeCoins.forEach((coin, address) => {
        if (wallet.nativeCoins.has(address)) {
          const existingCoin = wallet.nativeCoins.get(address)!;
          wallet.nativeCoins.set(address, new NativeCoin(existingCoin.amount + coin.amount));
        } else {
          wallet.nativeCoins.set(address, coin);
        }
      });

      walletData.nfts.forEach((nft, tokenId) => {
        wallet.nfts.set(tokenId, nft);
      });

      walletData.runes.forEach((rune, type) => {
        if (wallet.runes.has(type)) {
          const existingRune = wallet.runes.get(type)!;
          wallet.runes.set(type, new Rune(type, existingRune.value + rune.value));
        } else {
          wallet.runes.set(type, rune);
        }
      });
    });
  }

  private rollbackWallets(newOutputs: Wallets) {
    newOutputs.forEach((walletData, key) => {
      if (!this.wallets.has(key)) {
        return;
      }
      const wallet = this.wallets.get(key)!;

      walletData.nativeCoins.forEach((coin, address) => {
        if (wallet.nativeCoins.has(address)) {
          const existingCoin = wallet.nativeCoins.get(address)!;
          wallet.nativeCoins.set(address, new NativeCoin(existingCoin.amount + coin.amount));
        }
      });

      walletData.nfts.forEach((nft, tokenId) => {
        if (wallet.nfts.has(tokenId)) {
          wallet.nfts.delete(tokenId);
        }
      });

      walletData.runes.forEach((rune, type) => {
        if (wallet.runes.has(type)) {
          const existingRune = wallet.runes.get(type)!;
          wallet.runes.set(type, new Rune(type, existingRune.value + rune.value));
        }
      });
    });
  }
}



