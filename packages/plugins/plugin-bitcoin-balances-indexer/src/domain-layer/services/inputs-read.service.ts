import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@easylayer/read-database';
import { InputViewModel } from '../view-models';

@Injectable()
export class InputsReadService {
  constructor(
    // IMPORTANT: 'balances-indexer-read' name have to be the same as name in module connection
    @InjectRepository(InputViewModel, 'balances-indexer-read')
    private readDb: Repository<InputViewModel>
  ) {}

  async createMany({ inputs }: { inputs: any }): Promise<InputViewModel[]> {
    const { raw } = await this.readDb
      .createQueryBuilder()
      .insert()
      .into(InputViewModel)
      .values(
        inputs.map((item: any) => ({
          ...item,
          output_txid: item.outputTxId,
          output_n: Number(item.outputN),
        }))
      )
      .execute();

    return raw;
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
