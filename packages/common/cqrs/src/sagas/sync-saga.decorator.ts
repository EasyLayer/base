import 'reflect-metadata';
import { SYNC_SAGA_METADATA } from '../constants';

export const SyncSaga = (): PropertyDecorator => {
  return (target: object, propertyKey: string | symbol) => {
    const properties = Reflect.getMetadata(SYNC_SAGA_METADATA, target.constructor) || [];
    Reflect.defineMetadata(SYNC_SAGA_METADATA, [...properties, propertyKey], target.constructor);
  };
};
