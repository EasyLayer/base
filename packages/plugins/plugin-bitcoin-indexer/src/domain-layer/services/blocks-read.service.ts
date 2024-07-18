import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository, In } from '@easylayer/read-database';
import { BlockViewModel } from '../view-models/block.view-model';

@Injectable()
export class BlocksReadService {
  constructor(
    // IMPORTANT: 'indexer-read' name have to be the same as name in module connection
    @InjectRepository(BlockViewModel, 'indexer-read')
    private readDb: Repository<BlockViewModel>
  ) {}

  async create({
    hash,
    status,
    height,
    previousblockhash,
  }: {
    hash: string;
    status: string;
    height: string | number;
    previousblockhash: string;
  }): Promise<BlockViewModel> {
    const block = new BlockViewModel({
      hash,
      status,
      height: String(height),
      previousblockhash,
    });
    // IMPORTANT: we do not use the save method here because there is a bug with it
    // Since he uses his own transactions (get and then insert) then
    // this isolates the line until it completes and thus we do not see the record from another handler
    // It seems to work with insert method.
    // I also tried upsert here, it seems to work, but I need to test it

    // await this.readDb.insert(block);
    await this.readDb.upsert(block, ['hash']);
    return block;
  }

  async update(criteria: any, dto: any): Promise<any> {
    const block = new BlockViewModel(dto);
    return await this.readDb.update(criteria, block);
  }

  async updateWithBuilder(criteria: any, dto: any): Promise<any> {
    return await this.readDb.createQueryBuilder().update(BlockViewModel).set(dto).where(criteria).execute();
  }

  async findOne({ where, relations = [] }: { where: object; relations?: string[] }): Promise<BlockViewModel | null> {
    return await this.readDb.findOne({
      where,
      relations,
    });
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
