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

  async create({ txid, ...dto }: { txid: string, hash: string }): Promise<TransactionViewModel> {
    return await this.readDb.save({ ...dto, txid });
  }

  async createMany({ block, batch, status }: { block: any, status: string, batch: any }): Promise<TransactionViewModel[]> {
    const transactions: TransactionViewModel[] = [];
    
    batch.transactions.forEach((item: any) => {
      const tx = new TransactionViewModel({
        txid: item.txid,
        block,
        status
      });
      transactions.push(tx);
    });

    return await this.readDb.save(transactions);
  }

  async update(transactionViewModel: TransactionViewModel): Promise<TransactionViewModel> {
    // TODO: check first or not??
    return await this.readDb.save(transactionViewModel);
  }

  async findOneById(txid: string): Promise<TransactionViewModel | null> {
    try {
      return await this.readDb.findOneByOrFail({ txid });
    } catch (error) {
      return null;
    }
  }

  async findAll(): Promise<TransactionViewModel[]> {
    const [blocks, total] = await this.readDb.findAndCount();
    return blocks;
  }
}
