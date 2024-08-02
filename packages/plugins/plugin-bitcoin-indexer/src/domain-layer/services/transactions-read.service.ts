import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@easylayer/core/read-database';
import { TransactionViewModel } from '../view-models';

@Injectable()
export class TransactionsReadService {
  constructor(
    // IMPORTANT: 'indexer-read' name have to be the same as name in module connection
    @InjectRepository(TransactionViewModel, 'indexer-read')
    private readDb: Repository<TransactionViewModel>
  ) {}

  async createMany({
    blockHash,
    transactions,
  }: {
    blockHash: string;
    transactions: any[];
  }): Promise<TransactionViewModel[]> {
    const { raw } = await this.readDb
      .createQueryBuilder()
      .insert()
      .into(TransactionViewModel)
      .values(
        transactions.map((item: any) => ({
          ...item,
          blockHash,
          status: 'indexed',
        }))
      )
      // IMPORTANT: At the current stage this ensures idempotency
      .orIgnore()
      // IMPORTANT: We use createQueryBuilder with "updateEntity = false" option to ensure there is only one query
      // (without select after insert)
      .updateEntity(false)
      .execute();

    return raw;
  }

  // async createMany({
  //   blockHash,
  //   transactions,
  //   status,
  // }: {
  //   blockHash: string;
  //   status: string;
  //   transactions: any;
  // }): Promise<TransactionViewModel[]> {
  //   const transactions: TransactionViewModel[] = [];
  //   const block = new BlockViewModel({ hash: blockHash });

  // batch.tx.forEach((item: any) => {
  //   const tx = new TransactionViewModel({
  //     txid: item.txid,
  //     vin: item.vin,
  //     vout: item.vout,
  //     status,
  //     block,
  //   });
  //   transactions.push(tx);
  // });

  //   await this.readDb.upsert(transactions, ['txid']);
  //   return transactions;
  // }

  async updateWithBuilder(criteria: any, dto: any): Promise<any> {
    const queryBuilder = this.readDb.createQueryBuilder().update(TransactionViewModel).set(dto);

    Object.entries(criteria).forEach(([column, value]) => {
      if (Array.isArray(value)) {
        queryBuilder.andWhere(`${column} IN (:...${column})`, { [column]: value });
      } else {
        queryBuilder.andWhere(`${column} = :${column}`, { [column]: value });
      }
    });

    return await queryBuilder.execute();
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
