// import { Type } from '@nestjs/common';

export type Hash = `0x${string}`;

export interface AdapterOptions<T extends BaseNodeAdapter = BaseNodeAdapter> {
  // useClass?: Type<AdapterOptionsFactory<T>>;
  useFactory?: (...args: any[]) => Promise<T> | T;
}

// If we use useClass, then we do not pass the adapter there, but the class of the factory that has
// createAdapter method, and that factory class must create an adapter instance for us itself
// export interface AdapterOptionsFactory<T extends BaseNodeAdapter = BaseNodeAdapter> {
//     createAdapter(...args: any[]): Promise<T> | T;
// }

export interface BaseOptions {
  name: string;
}

export abstract class BaseNodeAdapter<TOptions extends BaseOptions = BaseOptions> {
  public readonly name!: string;
  protected connectionOptions: Omit<TOptions, 'name'>;

  constructor(options: TOptions) {
    const { name, ...restOptions } = options;
    this.name = name;
    this.connectionOptions = restOptions;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract healthcheck(): Promise<boolean>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendTransaction(transaction: any): Promise<any> {
    throw new Error('Method sendTransaction() is not supported by this provider');
  }

  async getBlockHeight(): Promise<bigint> {
    throw new Error('Method getBlockHeight() is not supported by this provider');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getOneBlockByHeight(height: string | bigint): Promise<any> {
    throw new Error('Method getOneBlockByHeight() is not supported by this provider');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getOneBlockHashByHeight(height: string | bigint): Promise<any> {
    throw new Error('Method getOneBlockHashByHeight() is not supported by this provider');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getManyBlocksByHeights(heights: string[] | bigint[]): Promise<any> {
    throw new Error('Method getManyBlocksByHeight() is not supported by this provider');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getOneBlockByHash(hash: Hash): Promise<any> {
    throw new Error('Method getOneBlockByHash() is not supported by this provider');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getManyBlocksByHashes(hash: Hash[]): Promise<any> {
    throw new Error('Method getManyBlockByHash() is not supported by this provider');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getOneTransactionByHash(hash: Hash): Promise<any> {
    throw new Error('Method getOneTransactionByHash() is not supported by this provider');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getManyTransactionsByHashes(hash: Hash[]): Promise<any> {
    throw new Error('Method getManyTransactionsByHashes() is not supported by this provider');
  }
}
