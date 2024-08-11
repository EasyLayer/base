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

    const { raw } = await this.readDb
      .createQueryBuilder()
      .insert()
      .into(InputViewModel)
      .values(valuesToInsert)
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

    return raw;
  }
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
