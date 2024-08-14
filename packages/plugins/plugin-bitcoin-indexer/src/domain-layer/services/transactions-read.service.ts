import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@easylayer/core/read-database';
import { AppLogger } from '@easylayer/components/logger';
import { TransactionViewModel } from '../view-models';
import { ReadDatabaseConfig } from '../../config';

@Injectable()
export class TransactionsReadService {
  constructor(
    // IMPORTANT: 'indexer-views' name have to be the same as name in module connection
    @InjectRepository(TransactionViewModel, 'indexer-views')
    private readDb: Repository<TransactionViewModel>,
    private readonly config: ReadDatabaseConfig,
    private readonly log: AppLogger
  ) {}

  async createMany(processedTx: Map<string, any[]>): Promise<TransactionViewModel[]> {
    const valuesToInsert = [];

    for (const [blockHash, tx] of processedTx) {
      valuesToInsert.push(
        ...tx.map((t: any) => ({
          ...t,
          block_hash: blockHash,
        }))
      );
    }

    const batches = this.prepareBatches(valuesToInsert);

    const rawResults = [];

    for (const batch of batches) {
      const { raw } = await this.readDb
        .createQueryBuilder()
        .insert()
        .into(TransactionViewModel)
        .values(batch)
        // IMPORTANT: At the current stage this ensures idempotency
        .orIgnore()
        // IMPORTANT: We use createQueryBuilder with "updateEntity = false" option to ensure there is only one query
        // (without select after insert)
        .updateEntity(false)
        .execute();

      rawResults.push(raw);
    }

    return rawResults.flat();
  }

  private prepareBatches(valuesToInsert: any[]): any[][] {
    const isSQLite = this.readDb.manager.connection.options.type === 'sqlite';

    if (!isSQLite) {
      // If it's not SQLite, return the entire array as one batch
      return [valuesToInsert];
    }

    const batchSize = Math.floor(
      this.config.BITCOIN_INDEXER_READ_DB_SQLITE_MAX_VARIABLES / Object.keys(valuesToInsert[0]).length
    );

    // If there is more data than batchSize, we split it into batches
    if (valuesToInsert.length > batchSize) {
      return this.chunkArray(valuesToInsert, batchSize);
    }

    // If the data is less than batchSize, return it in one batch
    return [valuesToInsert];
  }

  // Method for splitting an array into chunks (batches)
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const results: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      results.push(array.slice(i, i + chunkSize));
    }
    return results;
  }

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
