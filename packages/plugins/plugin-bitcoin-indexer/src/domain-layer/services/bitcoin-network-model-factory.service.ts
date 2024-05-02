import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { EventStoreRepository } from '@easylayer/eventstore';
import { Network } from '../models/network.model';

@Injectable()
export class BitcoinNetworkModelFactoryService {

  constructor(
    private readonly publisher: EventPublisher,
    private readonly networkRepository: EventStoreRepository<Network>
  ) {
    // this.testNetworkAggregate = this.publisher.mergeObjectContext(new Network());
    // this.testNetworkAggregate.aggregateId = uuidv4();
    // this.testNetworkAggregate.indexedBlockFromHeight = BigInt('0');
    // this.testNetworkAggregate.indexedBlockHeight = BigInt('0');
  }

  public createNewModel(): Network {
    return this.publisher.mergeObjectContext(new Network());
  }

  public async initByExtraModel(): Promise<Network> {
    // Network aggregate может быть только один в нашей системе. 
    // Поэтому когда мы делаем init, мы 
    // 1. Проверяем в базе есть ли с таким то именем аггрегат 
    const model = await this.networkRepository.getOneByExtra(this.createNewModel());
    // 2. Если в базе такого нет то мы создаем просто модель базовую. 
    return model;
  }
}
