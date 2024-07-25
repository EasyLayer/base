import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@easylayer/read-database';
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

  async createMany({ outputs, blockHeight }: { outputs: any; blockHeight: string }): Promise<OutputViewModel[]> {
    const { raw } = await this.readDb
      .createQueryBuilder()
      .insert()
      .into(OutputViewModel)
      .values(
        outputs.map((item: any) => ({
          ...item,
          value: item.value.toString(),
          n: Number(item.n),
          block_height: Number(blockHeight),
          is_suspended: false,
        }))
      )
      // IMPORTANT: At the current stage this ensures idempotency
      .orIgnore()
      // .orUpdate(
      //   ['txid', 'n'],
      //   ['value']
      // )
      // IMPORTANT: We use createQueryBuilder with "updateEntity = false" option to ensure there is only one query
      // (without select after insert)
      .updateEntity(false)
      .execute();

    return raw;
  }

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
