import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@easylayer/read-database';
import { BlockViewModel } from '../view-models/block.view-model';

@Injectable()
export class BlocksReadService {
  constructor(
    // IMPORTANT: 'indexer-read' name have to be the same as name in module connection
    @InjectRepository(BlockViewModel, 'indexer-read')
    private readDb: Repository<BlockViewModel>
  ) {}

  async create({ id, hash, status }: { id: string, hash: string, status: string }): Promise<BlockViewModel> {
    return await this.readDb.save({ hash, id, status });
  }

  async update(blockViewModel: BlockViewModel): Promise<BlockViewModel> {
    // TODO: check first or not??
    return await this.readDb.save(blockViewModel);
  }

  async findOneById(id: string): Promise<BlockViewModel> {
    return await this.readDb.findOneByOrFail({ id });
  }

  async findAll(): Promise<BlockViewModel[]> {
    const [blocks, total] = await this.readDb.findAndCount();
    return blocks;
  }
}
