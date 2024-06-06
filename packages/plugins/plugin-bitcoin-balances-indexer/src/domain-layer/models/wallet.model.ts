import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinWalletBalancesAddedEvent
} from '@easylayer/domain-cqrs-components/bitcoin';

export abstract class Balance {
  constructor(
    public readonly type: OutputTypes,
  ) {}
}

export type PublicKey = string;
export type Address = string;

export enum OutputTypes {
  NATIVE = 'NATIVE',
  NFT = 'NFT',
  RUNE = 'RUNE'
}

export class Rune extends Balance {
  constructor(
    public readonly runeType: string,
    public value: number
  ) {
    super(OutputTypes.RUNE);
  }

  addValue(additionalValue: number) {
    this.value += additionalValue;
  }
}

export class NFT extends Balance {
  constructor(
    public readonly name: string,
    public readonly metadata: any,
    public readonly isRemoved: boolean = false
  ) {
    super(OutputTypes.NFT);
  }
}

export class NativeCoin extends Balance {
  constructor(
    public amount: bigint
  ) {
    super(OutputTypes.NATIVE);
  }

  addAmount(additionalAmount: bigint | string | number) {
    this.amount += BigInt(additionalAmount);
  }
}

export class BalanceWithAddress<T extends Balance> {
  constructor(
    public readonly address: Address,
    public readonly balance: T
  ) {}
}

type WalletBalances = Map<Address, {
  nativeCoins: Omit<NativeCoin, 'type'>,
  nfts: Omit<NFT, 'type'>[],
  runes: Omit<Rune, 'type'>[],
}>;

class BalanceFactory {
  static createNativeCoin(amount: bigint): NativeCoin {
    return new NativeCoin(amount);
  }

  static createNFT(name: string, metadata: any, isRemoved: boolean = false): NFT {
    return new NFT(name, metadata, isRemoved);
  }

  static createRune(runeType: string, value: number): Rune {
    return new Rune(runeType, value);
  }

  static createAddressedNativeCoin(amount: bigint, address: string): BalanceWithAddress<NativeCoin> {
    return new BalanceWithAddress(address, this.createNativeCoin(amount));
  }

  static createAddressedNFT(name: string, metadata: any, isRemoved: boolean = false, address: string): BalanceWithAddress<NFT> {
    return new BalanceWithAddress(address, this.createNFT(name, metadata, isRemoved));
  }

  static createAddressedRune(runeType: string, value: number, address: string): BalanceWithAddress<Rune> {
    return new BalanceWithAddress(address, this.createRune(runeType, value));
  }
}

export class Wallet extends AggregateRoot {
  public aggregateId!: string; //publicKey
  public walletBalances: WalletBalances = new Map()

  public async add({
    aggregateId,
    requestId,
    balances
  }: {
    aggregateId: string;
    requestId: string;
    balances: BalanceWithAddress<Balance>[];
  }) {
    this.aggregateId = aggregateId;

    // IMPORTANT: В одном батче могут быть одни и теже кошельки 
    // Так как мы по публичному ключу перезаписываем модели кошлеьков (чтобы не восстанавливать их)
    // то мы должны взять теперь массив со всеми моделями и сгруппировать по aggregateId

    // Группируем балансы по адресам и получаем WalletBalances(наша основная стурктура)
    const walletBalances = this.groupBalancesByAddress(balances);

    await this.apply(new BitcoinWalletBalancesAddedEvent({ aggregateId, requestId, walletBalances }));
  }

  private onBitcoinWalletBalancesAddedEvent({ payload }: BitcoinWalletBalancesAddedEvent) {
    const { aggregateId, walletBalances } = payload;
    this.aggregateId = aggregateId;

    // Тут мы по идее должны взять те балансы сгруппированные 
    // достать от туда значения и подобавлять в уже существующие если таковы есть
    this.updateWallets(walletBalances);
  }
  
  private updateWallets(walletBalances: WalletBalances): void {
    walletBalances.forEach((balances, address) => {
      if (!this.walletBalances.has(address)) {
        this.walletBalances.set(address, {
          nativeCoins: new NativeCoin(0n),
          nfts: [],
          runes: []
        });
      }

      const existingBalance = this.walletBalances.get(address)!;

      // Обновляем native coins
      existingBalance.nativeCoins.addAmount(balances.nativeCoins.amount);

      // Обновляем NFTs
      balances.nfts.forEach(nft => {
        const existingNFTIndex = existingBalance.nfts.findIndex(existingNft => existingNft.name === nft.name);
        if (existingNFTIndex >= 0) {
          existingBalance.nfts.splice(existingNFTIndex, 1);
        }
        // TODO: тут нужно найти такой nft и поставить ему что он удален? 
        if (!nft.isRemoved) {
          existingBalance.nfts.push(nft);
        }
      });

      // Обновляем runes
      balances.runes.forEach(rune => {
        const existingRuneIndex = existingBalance.runes.findIndex(existingRune => existingRune.runeType === rune.runeType);
        if (existingRuneIndex >= 0) {
          existingBalance.runes[existingRuneIndex].addValue(rune.value);
        } else {
          existingBalance.runes.push(rune);
        }
      });
    });
  }

  private groupBalancesByAddress(balances: BalanceWithAddress<Balance>[]): WalletBalances {
    const walletBalancesMap: WalletBalances = new Map();
  
    balances.forEach(item => {
      const { address, balance } = item;
  
      if (!walletBalancesMap.has(address)) {
        walletBalancesMap.set(address, {
          nativeCoins: new NativeCoin(0n),
          nfts: [],
          runes: []
        });
      }
  
      const walletBalance = walletBalancesMap.get(address)!;
  
      if (balance instanceof NativeCoin) {
        walletBalance.nativeCoins.addAmount(balance.amount);
      } else if (balance instanceof NFT) {
        const existingNFTIndex = walletBalance.nfts.findIndex(nft => nft.name === balance.name);
        if (existingNFTIndex >= 0) {
          walletBalance.nfts.splice(existingNFTIndex, 1);
        }
        if (!balance.isRemoved) {
          walletBalance.nfts.push(balance);
        }
      } else if (balance instanceof Rune) {
        const existingRuneIndex = walletBalance.runes.findIndex(rune => rune.runeType === balance.runeType);
        if (existingRuneIndex >= 0) {
          walletBalance.runes[existingRuneIndex].addValue(balance.value);
        } else {
          walletBalance.runes.push(balance);
        }
      }
  
      // Сохраняем обновленный баланс обратно в карту
      walletBalancesMap.set(address, walletBalance);
    });
  
    return walletBalancesMap;
  }
  
}

export const createWalletBalances = (transactions: any[], isRollback: boolean = false): Map<PublicKey, BalanceWithAddress<Balance>[]> => {
  const balanceMap: Map<PublicKey, BalanceWithAddress<Balance>[]> = new Map();

  transactions.forEach(transaction => {
    transaction.vin.forEach((input: any) => {
      const transactionType = determineTransactionType(input);
      if (transactionType) {
        const balance = createBalanceFromInput(transactionType, input, isRollback);
        if (balance) {
          addBalanceToMap(balanceMap, input.publicKey, balance);
        }
      }
    });

    transaction.vout.forEach((output: any) => {
      const transactionType = determineTransactionType(output);
      if (transactionType) {
        const balance = createBalanceFromOutput(transactionType, output, isRollback);
        if (balance) {
          addBalanceToMap(balanceMap, output.publicKey, balance);
        }
      }
    });
  });

  return balanceMap;
}

const addBalanceToMap = (balanceMap: Map<PublicKey, BalanceWithAddress<Balance>[]>, publicKey: PublicKey, balanceWithAddress: BalanceWithAddress<Balance>): void => {
  if (!balanceMap.has(publicKey)) {
    balanceMap.set(publicKey, []);
  }
  balanceMap.get(publicKey)!.push(balanceWithAddress);
}

const createBalanceFromInput = (type: OutputTypes, input: any, isRollback: boolean): BalanceWithAddress<Balance> | undefined => {
  switch (type) {
    case OutputTypes.NATIVE:
      return BalanceFactory.createAddressedNativeCoin(BigInt(input.amount) * (isRollback ? 1n : -1n), input.address);
    case OutputTypes.NFT:
      return BalanceFactory.createAddressedNFT(input.name, input.metadata, isRollback ? false : true, input.address);
    case OutputTypes.RUNE:
      return BalanceFactory.createAddressedRune(input.type, input.value * (isRollback ? 1 : -1), input.address);
    default:
      return undefined;
  }
}

const createBalanceFromOutput = (type: OutputTypes, output: any, isRollback: boolean): BalanceWithAddress<Balance> | undefined => {
  switch (type) {
    case OutputTypes.NATIVE:
      return BalanceFactory.createAddressedNativeCoin(BigInt(output.amount) * (isRollback ? -1n : 1n), output.address);
    case OutputTypes.NFT:
      return BalanceFactory.createAddressedNFT(output.name, output.metadata, isRollback ? true : false, output.address);
    case OutputTypes.RUNE:
      return BalanceFactory.createAddressedRune(output.type, output.value * (isRollback ? -1 : 1), output.address);
    default:
      return undefined;
  }
}

const determineTransactionType = (outputs: any[]): OutputTypes | undefined => {
  if (outputs.some(output => output.tokenType === 'rune')) {
    return OutputTypes.RUNE;
  } else if (outputs.some(output => output.contractAddress && output.tokenId)) {
    return OutputTypes.NFT;
  } else if (outputs.some(output => output.amount && output.address)) {
    return OutputTypes.NATIVE;
  }
  return undefined;
}



