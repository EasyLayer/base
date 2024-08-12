import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@easylayer/core/read-database';
import { InputViewModel } from '../view-models';

@Injectable()
export class InputsReadService {
  constructor(
    // IMPORTANT: 'balances-indexer-read' name have to be the same as name in module connection
    @InjectRepository(InputViewModel, 'balances-indexer-read')
    private readDb: Repository<InputViewModel>
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

    // if (batches.length > 1) {
    //   // Удаляем индексы перед вставкой
    //   await this.removeIndexes();
    // }

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

      // if (batches.length > 1) {
      //   // Пересоздаем индексы после вставки
      //   await this.recreateIndexes();
      // }

      rawResults.push(raw);
    }

    return rawResults.flat();
  }

  private async removeIndexes() {
    const isSQLite = this.readDb.manager.connection.options.type === 'sqlite';
    if (!isSQLite) {
      return;
    }
    await this.readDb.query(`DROP INDEX IF EXISTS UQ__output_txid__output_n;`);
  }

  private async recreateIndexes() {
    const isSQLite = this.readDb.manager.connection.options.type === 'sqlite';
    if (!isSQLite) {
      return;
    }
    await this.readDb.query(`CREATE UNIQUE INDEX UQ__output_txid__output_n ON inputs(output_txid, output_n);`);
  }

  // Метод для подготовки батчей
  private prepareBatches(valuesToInsert: any[]): any[][] {
    const isSQLite = this.readDb.manager.connection.options.type === 'sqlite';

    let batchSize = 1;

    if (isSQLite) {
      const maxVariables = 999; // Максимальное количество переменных для SQLite
      batchSize = Math.floor(maxVariables / Object.keys(valuesToInsert[0]).length);
    }

    // Если количество данных больше максимального, разбиваем на батчи
    return valuesToInsert.length > batchSize ? this.chunkArray(valuesToInsert, batchSize) : [valuesToInsert];
  }

  // Метод для разбивания массива на чанки (батчи)
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const results: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      results.push(array.slice(i, i + chunkSize));
    }
    return results;
  }

  // async createMany(processedInputs: Map<number, any[]>): Promise<InputViewModel[]> {
  //   const valuesToInsert = [];

  // for (const [, inputs] of processedInputs) {
  //   valuesToInsert.push(
  //     ...inputs.map((input) => ({
  //       txid: input.txid,
  //       output_txid: input.outputTxId,
  //       output_n: Number(input.outputN),
  //     }))
  //   );
  // }

  //   const { raw } = await this.readDb
  //     .createQueryBuilder()
  //     .insert()
  //     .into(InputViewModel)
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
  // async createMany({ inputs }: { inputs: any }): Promise<InputViewModel[]> {
  //   const { raw } = await this.readDb
  //     .createQueryBuilder()
  //     .insert()
  //     .into(InputViewModel)
  //     .values(
  //       inputs.map((item: any) => ({
  //         ...item,
  //         output_txid: item.outputTxId,
  //         output_n: Number(item.outputN),
  //       }))
  //     )
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
