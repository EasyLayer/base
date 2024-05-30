import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@easylayer/read-database';
import { TransactionViewModel } from '../view-models/transaction.view-model';

@Injectable()
export class TransactionsReadService {
  constructor(
    // IMPORTANT: 'indexer-read' name have to be the same as name in module connection
    @InjectRepository(TransactionViewModel, 'balances-indexer-read')
    private readDb: Repository<TransactionViewModel>
  ) {}

  async create({ id, hash }: { id: string, hash: string }): Promise<TransactionViewModel> {
    return await this.readDb.save({ hash, id });
  }

  async update(transactionViewModel: TransactionViewModel[]): Promise<TransactionViewModel[]> {
    // TODO: check first or not??
    return await this.readDb.save(transactionViewModel);
  }

  async findOneById(id: string): Promise<TransactionViewModel> {
    return await this.readDb.findOneByOrFail({ id });
  }

  async findAll(): Promise<TransactionViewModel[]> {
    const [blocks, total] = await this.readDb.findAndCount();
    return blocks;
  }

  // Получить список адресов по ID транзакции
  async getAddressesByTransactionId(transactionId: string): Promise<string[]> {
    const transaction = await this.readDb.findOne({
      where: { id: transactionId },
      relations: ['address']
    });
    if (!transaction || !transaction.address) return [];

    return [transaction.address.id];
  }
}
