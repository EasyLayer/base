import { BlockchainEvent } from './base-view-event';

export type MapperType = new () => IListenerMapper;

export interface IListenerMapper {
  handle(data: any): Promise<BlockchainEvent | BlockchainEvent[]>;
  reorganisation(data: any): Promise<BlockchainEvent | BlockchainEvent[]>;
}
