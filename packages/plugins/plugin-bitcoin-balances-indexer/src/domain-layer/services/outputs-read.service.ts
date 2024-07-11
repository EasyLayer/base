import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository, In } from '@easylayer/read-database';
import { OutputViewModel } from '../view-models';

@Injectable()
export class OutputsReadService {
  constructor(
    // IMPORTANT: 'balances-indexer-read' name have to be the same as name in module connection
    @InjectRepository(OutputViewModel, 'balances-indexer-read')
    private readDb: Repository<OutputViewModel>
  ) {}

  async createMany({
    outputs,
    blockHeight,
    txid,
  }: {
    outputs: any;
    blockHeight: string;
    txid: string;
  }): Promise<OutputViewModel[]> {
    const outputsViewModels: OutputViewModel[] = [];

    outputs.forEach((item: any) => {
      const tx = new OutputViewModel({
        address: item.address,
        amount: item.amount,
        voutIndex: item.voutIndex,
        isSpent: item.isSpent,
        blockHeight,
        txid,
      });
      outputsViewModels.push(tx);
    });

    await this.readDb.insert(outputsViewModels);
    return outputsViewModels;
  }

  async update(criteria: any, dto: any): Promise<any> {
    const output = new OutputViewModel(dto);
    return await this.readDb.update(criteria, output);
  }

  async findOneById(txid: string): Promise<OutputViewModel | null> {
    try {
      return await this.readDb.findOneByOrFail({ txid });
    } catch (error) {
      return null;
    }
  }

  async findMany(): Promise<OutputViewModel[]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [outputs, total] = await this.readDb.findAndCount();
    return outputs;
  }

  // async fetchAmountByAddress(address: string) {}
  // async fetchTransactionIdsByAddress(address: string) {}

  async suspend({ txid, outputsIndexes }: { txid: string; outputsIndexes: number[] }) {
    const output = new OutputViewModel({ isSuspend: true });
    return await this.readDb.update({ txid, voutIndex: In(outputsIndexes) }, output);
  }
}
