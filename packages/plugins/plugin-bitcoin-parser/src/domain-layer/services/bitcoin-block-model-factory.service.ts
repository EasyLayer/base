import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { Block } from '../models/block.model';

@Injectable()
export class BitcoinBlockModelFactoryService {
  constructor(private readonly publisher: EventPublisher) {}

  public createNewModel(): Block {
    return this.publisher.mergeObjectContext(new Block());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initExistingModel(aggragatorId: string): Promise<Block> {
    return {} as Block;
  }

  public async initAllModels(): Promise<Block[]> {
    // TODO
    return [];
  }
}
