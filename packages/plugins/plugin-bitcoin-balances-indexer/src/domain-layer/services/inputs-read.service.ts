import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@easylayer/core/read-database';
import { InputViewModel } from '../view-models';
import { ReadDatabaseConfig } from '../../config';

@Injectable()
export class InputsReadService {
  constructor(
    // IMPORTANT: 'balances-indexer-views' name have to be the same as name in module connection
    @InjectRepository(InputViewModel, 'balances-indexer-views')
    private readonly readDb: Repository<InputViewModel>,
    private readonly config: ReadDatabaseConfig
  ) {}

  async createMany(processedInputs: Map<number, any[]>): Promise<InputViewModel[]> {
    const valuesToInsert = [];

    for (const [, inputs] of processedInputs) {
      valuesToInsert.push(
        ...inputs.map((input) => ({
          txid: input.txid,
          output_txid: input.outputTxId,
          output_n: Number(input.outputN),
        }))
      );
    }

    const batches = this.prepareBatches(valuesToInsert);

    const rawResults = [];

    for (const batch of batches) {
      const { raw } = await this.readDb
        .createQueryBuilder()
        .insert()
        .into(InputViewModel)
        .values(batch)
        // IMPORTANT: At the current stage this ensures idempotency
        .orIgnore()
        // .orUpdate(
        //   ['output_txid', 'output_n'],
        //   ['txid']
        // )
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
      this.config.BITCOIN_BALANCES_INDEXER_READ_DB_SQLITE_MAX_VARIABLES / Object.keys(valuesToInsert[0]).length
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
    const queryBuilder = this.readDb.createQueryBuilder().update(InputViewModel).set(dto);

    Object.entries(criteria).forEach(([column, value]) => {
      if (Array.isArray(value)) {
        queryBuilder.andWhere(`${column} IN (:...${column})`, { [column]: value });
      } else {
        queryBuilder.andWhere(`${column} = :${column}`, { [column]: value });
      }
    });

    return await queryBuilder.execute();
  }

  async getSpentOutputs(address: string) {
    const spentOutputs = await this.readDb
      .createQueryBuilder()
      .select('output')
      .from(InputViewModel, 'input')
      .leftJoinAndSelect('input.output', 'output')
      .where('output.address = :address AND input.txid IS NOT NULL', { address })
      .getMany();

    return spentOutputs.map((input) => input.output);
  }
}
