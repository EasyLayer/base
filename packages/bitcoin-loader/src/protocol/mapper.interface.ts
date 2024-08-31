import { BaseViewModel } from './base-view-model';

export type MapperType = new () => ILoaderMapper;

export interface ILoaderMapper {
  load(data: any): Promise<BaseViewModel | BaseViewModel[]>;
  reorganisation(data: any): Promise<BaseViewModel | BaseViewModel[]>;
}
