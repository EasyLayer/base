import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { EventStoreRepository } from '@easylayer/eventstore';
import { Block } from '../models/block.model';

@Injectable()
export class BitcoinBlockModelFactoryService {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly blocksRepository: EventStoreRepository<Block>
  ) {}

  public createNewModel(): Block {
    return this.publisher.mergeObjectContext(new Block());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initExistingModel(aggragatorId: string): Promise<Block> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    return await this.blocksRepository.getOne(model);
  }

  // Логика наверное должна быть другой
  // Мы это события кладем в аггрегатор чтобы можно было его через commit запустить? 
  // Но нужно решить:
  // 1 - что п осохранению в базе, мы ж не можем это решать как то вручную и там же есть уже такая запись в базе
  // 2 - состояние аггрегата, чтобы небыло дубликатов
  // С первым наверное сохранять все же внутри метода commit?? 
  public async publishLastEvent(aggragatorId: string): Promise<void> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    const event = await this.blocksRepository.fetchLastEvent(model);
    return model.publish(event);
  }

  public async initAllModels(): Promise<Block[]> {
    // TODO
    return [];
  }
}
