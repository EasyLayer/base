import { PostgresError } from 'pg-error-enum';
import { Injectable, Inject } from '@nestjs/common';
import { Repository, QueryFailedError, In } from 'typeorm';
import { AggregateRoot, IEvent } from '@easylayer/cqrs';
import { EventDataModel, BasicEvent } from './event-data.model';

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
    // IMPORTANT: We have to go over the model of the unit here even if it is empty
    const { aggregateId } = model;

    if (!aggregateId) {
      return model;
    }

    const eventRaws = await this.eventStore.find({
      where: { aggregateId },
      order: { version: 'ASC' }, // TODO: think can we sort by "id" here?
    });

    await model.loadFromHistory(eventRaws.map(EventDataModel.deserialize));
    return model;
  }

  public async getMany(models: (T & { aggregateId: string })[]): Promise<T[]> {
    // Extract all aggregateIds from the models
    const aggregateIds = models.map((model) => model.aggregateId);

    // Query all events for the given aggregateIds
    const eventRaws = await this.eventStore.find({
      where: { aggregateId: In(aggregateIds) },
      order: { version: 'ASC' },
    });

    // Group events by aggregateId
    const eventsByAggregateId = eventRaws.reduce((acc: { [key: string]: any[] }, eventRaw: any) => {
      const aggregateId = eventRaw.aggregateId;
      if (!acc[aggregateId]) {
        acc[aggregateId] = [];
      }
      acc[aggregateId].push(EventDataModel.deserialize(eventRaw));
      return acc;
    }, {});

    // Ensure each group of events is sorted by version
    // TODO: think
    // Object.keys(eventsByAggregateId).forEach(aggregateId => {
    //   eventsByAggregateId[aggregateId].sort((a, b) => a.version - b.version);
    // });

    // Load history for each model and return the updated models
    await Promise.all(
      models.map(async (model) => {
        const events = eventsByAggregateId[model.aggregateId] || [];
        await model.loadFromHistory(events);
      })
    );

    return models;
  }

  public async fetchLastEvent(model: T & { aggregateId: string }): Promise<BasicEvent<IEvent> | undefined> {
    const { aggregateId } = model;

    if (!aggregateId) {
      return undefined;
    }

    // Find last event raw
    const eventRaw = await this.eventStore.findOne({
      where: { aggregateId },
      order: { version: 'DESC' },
    });

    if (!eventRaw) {
      return undefined;
    }

    const event = EventDataModel.deserialize(eventRaw);
    return event;
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
      this.handleDatabaseError(error);
    }
  }

  // This are possible methods at the future
  public async findEvents() {}

  // TODO: move to new file or class
  private handleDatabaseError(error: any): void {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError;

      // SQLite Error Handling
      if (driverError.code === 'SQLITE_CONSTRAINT') {
        const errorMessage = driverError.message;
        if (errorMessage.includes('UNIQUE constraint failed: events.requestId, events.aggregateId')) {
          // Idempotency protection, just return
          return;
        }
        if (errorMessage.includes('UNIQUE constraint failed: events.version, events.aggregateId')) {
          throw new Error('Version conflict error');
        }

        switch (driverError.message) {
          case 'UQ__request_id__aggregate_id':
            console.log('Idempotency protection, just return\n');
            return;
          case 'UQ__version__aggregate_id':
            throw new Error('Version conflict error');
          default:
            throw error;
        }
      }

      // PostgreSQL Error Handling
      if (driverError.code === PostgresError.UNIQUE_VIOLATION) {
        if (driverError.detail.includes('Key (request_id, aggregate_id)')) {
          // Idempotency protection, just return
          return;
        }
        if (driverError.detail.includes('Key (version, aggregate_id)')) {
          throw new Error('Version conflict error');
        }
        throw error;
      }

      throw error;
    }
  }
}
