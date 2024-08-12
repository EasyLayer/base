import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository, FindOneOptions, FindOptionsOrder } from '@easylayer/core/read-database';
import { OutputViewModel, InputViewModel } from '../view-models';

export const COINBASE_OUTPUT_VALUE = '0';
export const COINBASE_OUTPUT_N = -1;

@Injectable()
export class OutputsReadService {
  constructor(
    // IMPORTANT: 'balances-indexer-read' name have to be the same as name in module connection
    @InjectRepository(OutputViewModel, 'balances-indexer-read')
    private readDb: Repository<OutputViewModel>
  ) {}

  async createMany(processedOutputs: Map<number, any[]>): Promise<OutputViewModel[]> {
    const valuesToInsert = [];

    for (const [blockHeight, outputs] of processedOutputs) {
      valuesToInsert.push(
        ...outputs.map((output) => ({
          ...output,
          block_height: blockHeight,
          value: output.value.toString(),
          n: Number(output.n),
          is_suspended: false,
        }))
      );
    }

    const batches = this.prepareBatches(valuesToInsert);

    // if (batches.length > 1) {
    //   // Удаляем индексы перед вставкой
    //   await this.removeIndexes();
    // }

    const rawResults = [];

    for (const batch of batches) {
      const { raw } = await this.readDb
        .createQueryBuilder()
        .insert()
        .into(OutputViewModel)
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

    // if (batches.length > 1) {
    //   // Пересоздаем индексы после вставки
    //   await this.recreateIndexes();
    // }

    return rawResults.flat();
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

  // Метод для подготовки батчей
  private prepareBatches(valuesToInsert: any[]): any[][] {
    const isSQLite = this.readDb.manager.connection.options.type === 'sqlite';

    if (!isSQLite) {
      // Если это не SQLite, возвращаем весь массив как один батч
      return [valuesToInsert];
    }

    const maxVariables = 999; // Максимальное количество переменных для SQLite
    const batchSize = Math.floor(maxVariables / Object.keys(valuesToInsert[0]).length);

    // Если данных больше чем batchSize, разбиваем на батчи
    if (valuesToInsert.length > batchSize) {
      return this.chunkArray(valuesToInsert, batchSize);
    }

    return [valuesToInsert]; // Если данных меньше batchSize, возвращаем их в одном батче
  }

  // Метод для разбивания массива на чанки (батчи)
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const results: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      results.push(array.slice(i, i + chunkSize));
    }
    return results;
  }

  // async createMany(processedOutputs: Map<number, any[]>): Promise<OutputViewModel[]> {
  //   const valuesToInsert = [];

  //   for (const [blockHeight, outputs] of processedOutputs) {
  //     valuesToInsert.push(
  //       ...outputs.map((output) => ({
  //         ...output,
  //         block_height: blockHeight,
  //         value: output.value.toString(),
  //         n: Number(output.n),
  //         is_suspended: false,
  //       }))
  //     );
  //   }

  //   const { raw } = await this.readDb
  //     .createQueryBuilder()
  //     .insert()
  //     .into(OutputViewModel)
  //     .values(valuesToInsert)
  //     // IMPORTANT: At the current stage this ensures idempotency
  //     .orIgnore()
  //     // .orUpdate(
  //     //   ['output_txid', 'output_n'],
  //     //   ['txid']
  //     // )
  //     // IMPORTANT: We use createQueryBuilder with "updateEntity = false" option to ensure there is only one query
  //     // (without select after insert)
  //     .updateEntity(false)
  //     .execute();

  //   return raw;
  // }

  async updateWithBuilder(criteria: any, dto: any): Promise<any> {
    const queryBuilder = this.readDb.createQueryBuilder().update(OutputViewModel).set(dto);

    Object.entries(criteria).forEach(([column, value]) => {
      if (Array.isArray(value)) {
        queryBuilder.andWhere(`${column} IN (:...${column})`, { [column]: value });
      } else {
        queryBuilder.andWhere(`${column} = :${column}`, { [column]: value });
      }
    });

    return await queryBuilder.execute();
  }

  // async getAllOutputs() {
  //   const outputs = await this.readDb
  //     .createQueryBuilder()
  //     .select("output")
  //     .from(OutputViewModel, "output")
  //     .getMany();

  //   return outputs;
  // }
  async findOne(
    options: FindOneOptions<OutputViewModel> & { order?: FindOptionsOrder<OutputViewModel> }
  ): Promise<OutputViewModel | null> {
    const { order, ...rest } = options;

    return await this.readDb.findOne({
      ...rest,
      order,
    });
  }

  public async getLastOutput(): Promise<OutputViewModel> {
    const [lastOutput] = await this.readDb.find({
      order: { block_height: 'DESC' },
      take: 1,
    });

    return lastOutput;
  }

  async getBalanceByAdress(address: string) {
    const result = await this.readDb
      .createQueryBuilder()
      .select('SUM(output.value)', 'balance')
      .from(OutputViewModel, 'output')
      .leftJoin(InputViewModel, 'input', 'output.txid = input.output_txid AND output.n = input.output_n')
      .where('output.address = :address AND output.is_suspended = false AND input.txid IS NULL', { address })
      .getRawOne();

    return result.balance;
  }

  async trackFunds(txid: string, index: number) {
    const result = await this.readDb.query(
      `
      WITH RECURSIVE fund_chain AS (
        SELECT
          o.txid AS original_txid,
          o.n AS original_index,
          o.address AS original_address,
          o.value AS original_value,
          i.txid AS spent_in_txid,
          i.output_txid AS output_txid,
          i.output_n AS output_index
        FROM outputs o
        LEFT JOIN inputs i ON o.txid = i.output_txid AND o.n = i.output_n
        WHERE o.txid = $1 AND o.n = $2
        UNION ALL
        SELECT
          o.txid,
          o.n,
          o.address,
          o.value,
          i.txid,
          i.output_txid,
          i.output_n
        FROM outputs o
        LEFT JOIN inputs i ON o.txid = i.output_txid AND o.n = i.output_n
        INNER JOIN fund_chain fc ON fc.spent_in_txid = o.txid AND fc.output_index = o.n
      )
      SELECT * FROM fund_chain;
    `,
      [txid, index]
    );

    return result;
  }

  async getAvailableOutputs(address: string) {
    const outputs = await this.readDb
      .createQueryBuilder()
      .select('output')
      .from(OutputViewModel, 'output')
      .leftJoin(InputViewModel, 'input', 'output.txid = input.output_txid AND output.n = input.output_n')
      .where('output.address = :address AND output.is_suspended = false AND input.txid IS NULL', { address })
      .getMany();

    return outputs;
  }

  async getBalanceByAddressUpToBlockHeight(address: string, blockHeight: number) {
    const result = await this.readDb
      .createQueryBuilder()
      .select('SUM(output.value)', 'balance')
      .from(OutputViewModel, 'output')
      .leftJoin(InputViewModel, 'input', 'output.txid = input.output_txid AND output.n = input.output_n')
      .where(
        'output.address = :address AND output.is_suspended = false AND input.txid IS NULL AND output.block_height <= :blockHeight',
        { address, blockHeight }
      )
      .getRawOne();

    return result.balance;
  }
}
