import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@easylayer/read-database';
import { AddressViewModel } from '../view-models/adress.view-model';

@Injectable()
export class AddresesReadService {
  constructor(
    // IMPORTANT: 'indexer-read' name have to be the same as name in module connection
    @InjectRepository(AddressViewModel, 'balances-indexer-read')
    private readDb: Repository<AddressViewModel>
  ) {}

  async create({ id, hash }: { id: string, hash: string }): Promise<AddressViewModel> {
    return await this.readDb.save({ hash, id });
  }

  async update(addressViewModel: AddressViewModel): Promise<AddressViewModel> {
    // TODO: check first or not??
    return await this.readDb.save(addressViewModel);
  }

  async findOneById(id: string): Promise<AddressViewModel> {
    return await this.readDb.findOneByOrFail({ id });
  }

  async findAll(): Promise<AddressViewModel[]> {
    const [blocks, total] = await this.readDb.findAndCount();
    return blocks;
  }
}
