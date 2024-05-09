// import { Type } from '@nestjs/common';
import { ProviderNodeOptions } from './interfaces'

export type Hash = `0x${string}`;

export abstract class BaseNodeProvider<T extends ProviderNodeOptions = ProviderNodeOptions> {
  protected _connectionOptions!: T;

  constructor(options: T) {
    this._connectionOptions = options;
  }

  get connectionOptions() {
    return this._connectionOptions;
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
