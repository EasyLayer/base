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

  async update(walletViewModel: WalletViewModel): Promise<WalletViewModel> {
    // TODO: check first or not??
    return await this.readDb.save(walletViewModel);
  }

  async findOneById(id: string): Promise<WalletViewModel> {
    return await this.readDb.findOneByOrFail({ id });
  }

  async findAll(): Promise<WalletViewModel[]> {
    const [blocks, total] = await this.readDb.findAndCount();
    return blocks;
  }
}
