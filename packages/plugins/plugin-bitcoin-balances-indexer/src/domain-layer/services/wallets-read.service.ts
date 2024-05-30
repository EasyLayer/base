import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@easylayer/read-database';
import { WalletViewModel } from '../view-models/wallet.view-model';

@Injectable()
export class WalletsReadService {
  constructor(
    // IMPORTANT: 'indexer-read' name have to be the same as name in module connection
    @InjectRepository(WalletViewModel, 'balances-indexer-read')
    private readDb: Repository<WalletViewModel>
  ) {}

  async create({ id, hash }: { id: string, hash: string }): Promise<WalletViewModel> {
    return await this.readDb.save({ hash, id });
  }

  async update(walletsViewModel: WalletViewModel[]): Promise<WalletViewModel[]> {
    // TODO: check first or not??
    return await this.readDb.save(walletsViewModel);
  }

  async findOneById(id: string): Promise<WalletViewModel> {
    return await this.readDb.findOneByOrFail({ id });
  }

  async findAll(): Promise<WalletViewModel[]> {
    const [blocks, total] = await this.readDb.findAndCount();
    return blocks;
  }

  // Получить баланс нативной валюты по публичному ключу
  async getNativeBalanceByPublicKey(publicKey: string): Promise<bigint> {
    const wallet = await this.readDb.findOne({ 
      where: { id: publicKey },
      relations: ['addresses']
    });

    if (!wallet) return BigInt(0);

    let balance = BigInt(0);
    for (const address of wallet.addresses) {
      for (const nativeCoin of Object.values(address.nativeCoins)) {
        balance += (nativeCoin as any)?.amount;
      }
    }
    return balance;
  }

  // Получить общий баланс (нативные монеты, руны, NFT) по публичному ключу
  async getTotalBalanceByPublicKey(publicKey: string): Promise<any> {
    const wallet = await this.readDb.findOne({ 
      where: { id: publicKey },
      relations: ['addresses']
    });
    if (!wallet) return null;

    let nativeBalance = BigInt(0);
    const runes: { [key: string]: number } = {};
    const nfts: { [key: string]: any } = {};

    for (const address of wallet.addresses) {
      // Суммируем нативные монеты
      for (const nativeCoin of Object.values(address.nativeCoins)) {
        nativeBalance += (nativeCoin as any)?.amount;
      }

      // Суммируем руны
      for (const [runeType, value] of Object.entries(address.runes)) {
        if (runes[runeType]) {
          runes[runeType] += value as any;
        } else {
          runes[runeType] = value as any;
        }
      }

      // Собираем NFT
      for (const [tokenId, nft] of Object.entries(address.nfts)) {
        nfts[tokenId] = nft;
      }
    }

    return {
      nativeBalance,
      runes,
      nfts
    };
  }
}
