import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository, In, FindOneOptions, FindOptionsOrder } from '@easylayer/core/read-database';
import { BlockViewModel } from '../view-models/block.view-model';

@Injectable()
export class BlocksReadService {
  constructor(
    // IMPORTANT: 'indexer-read' name have to be the same as name in module connection
    @InjectRepository(BlockViewModel, 'indexer-read')
    private readDb: Repository<BlockViewModel>
  ) {}

  async create({ block }: { block: any }): Promise<BlockViewModel> {
    const { raw } = await this.readDb
      .createQueryBuilder()
      .insert()
      .into(BlockViewModel)
      .values({
        ...block,
        height: block.height.toString(),
        previousblockhash:
          block.previousblockhash === '0000000000000000000000000000000000000000000000000000000000000000'
            ? null
            : block.previousblockhash,
        status: 'indexed',
      })
      // IMPORTANT: At the current stage this ensures idempotency
      .orIgnore()
      // IMPORTANT: We use createQueryBuilder with "updateEntity = false" option to ensure there is only one query
      // (without select after insert)
      .updateEntity(false)
      .execute();

    return raw;
  }

  // async updateWithBuilder(criteria: any, dto: any): Promise<any> {
  //   return await this.readDb.createQueryBuilder().update(BlockViewModel).set(dto).where(criteria).execute();
  // }
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

  public async getLastBlock(): Promise<BlockViewModel | null> {
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
