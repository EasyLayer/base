import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository, In, FindOneOptions, FindOptionsOrder } from '@easylayer/core/read-database';
import { AppLogger } from '@easylayer/components/logger';
import { BlockViewModel } from '../view-models/block.view-model';
import { ReadDatabaseConfig } from '../../config';

@Injectable()
export class BlocksReadService {
  constructor(
    // IMPORTANT: 'indexer-views' name have to be the same as name in module connection
    @InjectRepository(BlockViewModel, 'indexer-views')
    private readDb: Repository<BlockViewModel>,
    private readonly config: ReadDatabaseConfig,
    private readonly log: AppLogger
  ) {}

  async createMany(processedBlocks: any[]): Promise<BlockViewModel[]> {
    const valuesToInsert = [];

    valuesToInsert.push(
      ...processedBlocks.map((block: any) => ({
        ...block,
        height: block.height.toString(),
        previousblockhash:
          block.previousblockhash === '0000000000000000000000000000000000000000000000000000000000000000'
            ? null
            : block.previousblockhash,
        tx: [],
      }))
    );

    const batches = this.prepareBatches(valuesToInsert);

    const rawResults = [];

    for (const batch of batches) {
      const { raw } = await this.readDb
        .createQueryBuilder()
        .insert()
        .into(BlockViewModel)
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

  async createIndexes(tableName: string, columns: string[]) {
    const connectionType = this.readDb.manager.connection.options.type;

    const columnsList = columns.join(', ');

    switch (connectionType) {
      case 'sqlite':
        await this.readDb.query(
          `CREATE INDEX IF NOT EXISTS IDX_${columns.join('_')} ON ${tableName} (${columnsList});`
        );
        break;
      case 'postgres':
        await this.readDb.query(
          `CREATE INDEX IF NOT EXISTS IDX_${columns.join('_')} ON ${tableName} USING BTREE (${columnsList});`
        );
        break;
      default:
        throw new Error(`Not support databse type: ${connectionType}`);
    }
  }

  async updateWithBuilder(criteria: any, dto: any): Promise<any> {
    const queryBuilder = this.readDb.createQueryBuilder().update(BlockViewModel).set(dto);

    Object.entries(criteria).forEach(([column, value]) => {
      if (Array.isArray(value)) {
        queryBuilder.andWhere(`${column} IN (:...${column})`, { [column]: value });
      } else {
        queryBuilder.andWhere(`${column} = :${column}`, { [column]: value });
      }
    });

    return await queryBuilder.execute();
  }

  async findOne(
    options: FindOneOptions<BlockViewModel> & { order?: FindOptionsOrder<BlockViewModel> }
  ): Promise<BlockViewModel | null> {
    const { order, ...rest } = options;

    return await this.readDb.findOne({
      ...rest,
      order,
    });
  }

  public async getLastBlock(): Promise<BlockViewModel> {
    const [lastBlock] = await this.readDb.find({
      order: { height: 'DESC' },
      take: 1,
    });

    return lastBlock;
  }

  async findByHashes(hashes: string[]): Promise<BlockViewModel[]> {
    return this.readDb.findBy({
      hash: In(hashes),
    });
  }

  async findAll(): Promise<BlockViewModel[]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [blocks, total] = await this.readDb.findAndCount();
    return blocks;
  }
}
