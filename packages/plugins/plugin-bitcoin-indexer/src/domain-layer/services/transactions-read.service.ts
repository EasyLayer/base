import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@easylayer/read-database';
import { BlockViewModel, TransactionViewModel } from '../view-models';

@Injectable()
export class TransactionsReadService {
  constructor(
    // IMPORTANT: 'indexer-read' name have to be the same as name in module connection
    @InjectRepository(TransactionViewModel, 'indexer-read')
    private readDb: Repository<TransactionViewModel>
  ) {}

  // async create({ txid, ...dto }: { txid: string, hash: string }): Promise<TransactionViewModel> {
  //   return await this.readDb.upsert({ ...dto, txid });
  // }

  async createMany({
    blockHash,
    batch,
    status,
  }: {
    blockHash: string;
    status: string;
    batch: any;
  }): Promise<TransactionViewModel[]> {
    const transactions: TransactionViewModel[] = [];
    const block = new BlockViewModel({ hash: blockHash });

    batch.tx.forEach((item: any) => {
      const tx = new TransactionViewModel({
        txid: item.txid,
        vin: item.vin,
        vout: item.vout,
        status,
        block,
      });
      transactions.push(tx);
    });

    await this.readDb.upsert(transactions, ['txid']);
    return transactions;
  }

  async update(criteria: any, dto: any): Promise<any> {
    const tx = new TransactionViewModel(dto);
    return await this.readDb.update(criteria, tx);
  }

  async updateWithBuilder(criteria: any, dto: any): Promise<any> {
    return await this.readDb.createQueryBuilder().update(TransactionViewModel).set(dto).where(criteria).execute();
  }

  async updateManyByTxIds(txids: string[], status: string): Promise<any> {
    return await this.readDb
      .createQueryBuilder()
      .update(TransactionViewModel)
      .set({ status })
      .where('txid IN (:...txids)', { txids })
      .execute();
  }

  async findOneById(txid: string): Promise<TransactionViewModel | null> {
    try {
      return await this.readDb.findOneByOrFail({ txid });
    } catch (error) {
      return null;
    }
  }

  async findAll(): Promise<TransactionViewModel[]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [tx, total] = await this.readDb.findAndCount();
    return tx;
  }
}
