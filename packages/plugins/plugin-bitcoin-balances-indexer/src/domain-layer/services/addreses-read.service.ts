import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@easylayer/read-database';
import { AddressViewModel } from '../view-models/adress.view-model';

@Injectable()
export class AddresesReadService {
  constructor(
    // IMPORTANT: 'indexer-read' name have to be the same as name in module connection
    @InjectRepository(AddressViewModel, 'balances-indexer-read')
    private readDb: Repository<AddressViewModel>
  ) {}

  async create({ id, hash }: { id: string, hash: string }): Promise<AddressViewModel> {
    return await this.readDb.save({ hash, id });
  }

  async update(addressViewModel: AddressViewModel): Promise<AddressViewModel> {
    // TODO: check first or not??
    return await this.readDb.save(addressViewModel);
  }

  async findOneById(id: string): Promise<AddressViewModel> {
    return await this.readDb.findOneByOrFail({ id });
  }

  async findAll(): Promise<AddressViewModel[]> {
    const [blocks, total] = await this.readDb.findAndCount();
    return blocks;
  }

  // Получить баланс нативной валюты по адресу
  async getNativeBalanceByAddress(addressId: string): Promise<bigint> {
    const address = await this.readDb.findOneBy({ id: addressId });
    if (!address) return BigInt(0);

    let balance = BigInt(0);
    for (const nativeCoin of Object.values(address.nativeCoins)) {
      balance += nativeCoin.amount;
    }
    return balance;
  }

  // Получить общий баланс (нативные монеты, руны, NFT) по адресу
  async getTotalBalanceByAddress(addressId: string): Promise<any> {
    const address = await this.readDb.findOneBy({ id: addressId });
    if (!address) return null;

    let nativeBalance = BigInt(0);
    const runes: { [key: string]: number } = {};
    const nfts: { [key: string]: any } = {};

    // Суммируем нативные монеты
    for (const nativeCoin of Object.values(address.nativeCoins)) {
      nativeBalance += nativeCoin.amount;
    }

    // Суммируем руны
    for (const [runeType, rune] of Object.entries(address.runes)) {
      if (runes[runeType]) {
        runes[runeType] += rune.value;
      } else {
        runes[runeType] = rune.value;
      }
    }

    // Собираем NFT
    for (const [tokenId, nft] of Object.entries(address.nfts)) {
      nfts[tokenId] = nft;
    }

    return {
      nativeBalance,
      runes,
      nfts
    };
  }

  // Получить список ID транзакций по адресу
  async getTransactionIdsByAddress(addressId: string): Promise<string[]> {
    const address = await this.readDb.findOne({
      where: { id: addressId },
      relations: ['transactions']
    });
    if (!address) return [];

    return address.transactions.map(transaction => transaction.id);
  }

  // Получить список ID транзакций по публичному ключу
  async getTransactionIdsByPublicKey(publicKey: string): Promise<string[]> {
    const addresses = await this.readDb.find({
      where: { publicKey: { id: publicKey } },
      relations: ['transactions']
    });

    const transactionIds = [];
    for (const address of addresses) {
      transactionIds.push(...address.transactions.map(transaction => transaction.id));
    }
    return transactionIds;
  }
}
