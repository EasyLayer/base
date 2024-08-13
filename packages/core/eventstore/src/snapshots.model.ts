import { Entity, Column, PrimaryColumn } from 'typeorm';
import { AggregateRoot } from '@easylayer/core/cqrs';

export interface SnapshotParameters {
  aggregateId: string;
  type: string;
  payload: string;
}

@Entity('snapshots')
export class SnapshotsModel {
  @PrimaryColumn({ type: 'varchar' })
  public aggregateId!: string;

  @Column({ type: 'varchar' })
  public payload!: string;

  @Column({ type: 'varchar' })
  public type!: string;

  static deserialize<T extends AggregateRoot & { aggregateId: string }>(snapshot: SnapshotsModel): T {
    const { aggregateId, payload, type } = snapshot;

    // Create an empty object whose prototype is AggregateRoot
    const aggregate = Object.create(AggregateRoot.prototype) as T;

    // Assigning properties
    aggregate.aggregateId = aggregateId;
    Object.assign(aggregate, payload && hexToObject(payload));

    aggregate.constructor = { name: type } as typeof Object.constructor;

    return aggregate;
  }

  static serialize<T extends AggregateRoot & { aggregateId: string }>(aggregate: T): SnapshotsModel {
    const { aggregateId, ...payload } = aggregate;

    if (!aggregateId) {
      throw new Error('Aggregate Id is missed');
    }

    return new SnapshotsModel({
      aggregateId,
      payload: objectToHex(payload),
      type: Object.getPrototypeOf(aggregate).constructor.name,
    });
  }

  constructor(parameters: SnapshotParameters) {
    if (!parameters) {
      return;
    }

    this.aggregateId = parameters.aggregateId;
    this.type = parameters.type;
    this.payload = parameters.payload;
  }
}

export const stringToHex = (str: string) => {
  return Buffer.from(str, 'utf8').toString('hex');
};

export const objectToHex = (obj: any) => {
  const jsonString = JSON.stringify(obj);
  return stringToHex(jsonString);
};

export const hexToString = (hex: string) => {
  return Buffer.from(hex, 'hex').toString('utf8');
};

export const hexToObject = (hex: string) => {
  const jsonString = hexToString(hex);
  return JSON.parse(jsonString);
};
