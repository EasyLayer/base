import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@easylayer/read-database';
import { TransactionViewModel } from '../view-models/transaction.view-model';

@Injectable()
export class TransactionsReadService {
  constructor(
    // IMPORTANT: 'indexer-read' name have to be the same as name in module connection
    @InjectRepository(TransactionViewModel, 'indexer-read')
    private readDb: Repository<TransactionViewModel>
  ) {}

  async create({ id, ...dto }: { id: string, hash: string }): Promise<TransactionViewModel> {
    return await this.readDb.save({ ...dto, id });
  }

  async update(transactionViewModel: TransactionViewModel): Promise<TransactionViewModel> {
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
}
