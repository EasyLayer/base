import { Injectable, Inject } from '@nestjs/common';
import { Repository, QueryFailedError } from 'typeorm';
import { AggregateRoot, IEvent } from '@easylayer/cqrs';
import { EventDataModel } from './event-data.model';

@Injectable()
export class EventStoreRepository<T extends AggregateRoot = AggregateRoot> {
  constructor(
    @Inject('EVENT_DATA_MODEL_REPOSITORY')
    private eventStore: Repository<EventDataModel>
  ) {}

  public async save(models: T | T[]): Promise<void> {
    const aggregates: T[] = Array.isArray(models) ? models : [models];

    await Promise.all(aggregates.map((aggregate: T) => this.storeEvent(aggregate)));
  }

  public async getOne(model: T & { aggregateId: string }): Promise<T> {
    // Я смотрю что мы в любом случае должны тут преедать модель аггрегата
    // даже если она пустая
    const { aggregateId } = model;

    if (!aggregateId) {
      return model;
    }

    const eventRaws = await this.eventStore.find({
      where: { aggregateId },
      order: { version: 'ASC' },
    });

    await model.loadFromHistory(eventRaws.map(EventDataModel.deserialize));
    return model;
  }

  public async getMany() {}

  public async fetchLastEvent(model: T & { aggregateId: string }): Promise<T> {
    // Я смотрю что мы в любом случае должны тут преедать модель аггрегата
    // даже если она пустая
    const { aggregateId } = model;

    if (!aggregateId) {
      return model;
    }

    const eventRaws = await this.eventStore.find({
      where: { aggregateId },
      order: { version: 'ASC' },
    });

    await model.loadFromHistory(eventRaws.map(EventDataModel.deserialize));

    // TODO
    // if (retryLastEvent && eventRaws.length > 0) {
    //   await model.publish(eventRaws[eventRaws.length - 1]);
    // }

    return model;
  }

  public async getOneByExtra(model: T & { extra: string }): Promise<T> {
    const { extra } = model;

    if (!extra) {
      throw new Error(`Method getOneByExtra() is not supported by this aggregate`);
    }

    //We do NOT need aggregateId here, because we get events by extra

    const eventRaws = await this.eventStore.find({
      where: { extra },
      order: { version: 'ASC' },
    });

    await model.loadFromHistory(eventRaws.map(EventDataModel.deserialize));

    return model;
  }

  private async storeEvent(aggregate: T) {
    try {
      const uncommittedEvents: IEvent[] = aggregate.getUncommittedEvents();

      if (uncommittedEvents.length === 0) {
        return;
      }

      const events = uncommittedEvents.map((event) => {
        return EventDataModel.serialize(event, aggregate.version);
      });

      // We use createQueryBuilder with "updateEntity = false" option to ensure there is only one query
      // (without select after insert)
      await this.eventStore.createQueryBuilder().insert().values(events).updateEntity(false).execute();
    } catch (error) {
      console.log(error);
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError;

        // TODO
        if (driverError.code === 'SQLITE_CONSTRAINT') {
          throw new Error('Version conflict error');
          // switch (driverError.constraint) {
          //   // constraints are specified in entities
          //   case 'UQ__request_id__aggregate_id':
          //     console.log('Idempotency protection, just return\n');
          //     return;
          //   case 'UQ__version__aggregate_id':
          //     throw new Error('Version conflict error');
          //   default:
          //     throw error;;
          // }
        }
        throw error;
      }
    }
  }

  // This are possible methods at the future
  public async findEvents() {}
  public async findLastEvent() {}
}
