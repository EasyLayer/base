import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';
import { IEvent } from '@easylayer/cqrs';

export interface EventDataParameters {
  aggregateId: string;
  type: string;
  payload: Record<string, any>;
  version: number;
  requestId: string;
  extra: string;
}

@Entity('events')
@Unique('UQ__request_id__aggregate_id', ['requestId', 'aggregateId'])
@Unique('UQ__version__aggregate_id', ['version', 'aggregateId'])
export class EventDataModel {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Column({ type: 'uuid' })
  public aggregateId!: string;

  // делаем это поле extra , оно будет строкой, и сюда по сути можно будет доп уникальность зписать
  // то ли имя то ли какой то другой идентификатор и искать по нему. Думаю это будет хорошо.
  @Column({ type: 'varchar', default: null })
  public extra!: string;

  @Column({ type: 'int', default: 0 })
  public version!: number;

  @Column({ type: 'varchar', default: null })
  public requestId!: string;

  @Column({ type: 'varchar' })
  public type!: string;

  @Column({ type: 'json' })
  public payload!: Record<string, any>;

  static deserialize({ aggregateId, type, requestId, version, payload }: EventDataModel): IEvent {
    const aggregateEvent: IEvent = { ...payload, requestId, id: aggregateId };
    aggregateEvent.constructor = { name: type } as typeof Object.constructor;

    return Object.assign(Object.create(aggregateEvent), aggregateEvent);
  }

  static serialize(event: Record<string, any>, version: number): EventDataModel {
    const { aggregateId, extra, requestId, ...payload } = event;

    if (!aggregateId) {
      throw new Error('Aggregate Id is missed');
    }

    if (!requestId) {
      throw new Error('Request Id is missed');
    }

    if (!version) {
      throw new Error('Version is missed');
    }

    return new EventDataModel({
      aggregateId,
      version,
      payload,
      type: Object.getPrototypeOf(event).constructor.name,
      requestId,
      extra,
    });
  }

  constructor(parameters: EventDataParameters) {
    if (!parameters) {
      return;
    }

    this.aggregateId = parameters.aggregateId;
    this.type = parameters.type;
    this.payload = parameters.payload;
    this.version = parameters.version;
    this.requestId = parameters.requestId;
    this.extra = parameters.extra;
  }
}
