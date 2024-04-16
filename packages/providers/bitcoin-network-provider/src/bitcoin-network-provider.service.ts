import { Injectable } from '@nestjs/common';
import { ConnectionManager } from './connection-manager';
import { Hash } from './node-adapters/base-node-adapter';

@Injectable()
export class BitcoinNetworkProviderService {
  constructor(private _connectionManager: ConnectionManager) {}

  get connectionManager() {
    return this._connectionManager;
  }

  public async getCurrentBlockHeight(): Promise<bigint> {
    const provider = await this._connectionManager.getCurrentAdapter();
    return await provider.getBlockHeight();
  }

  public async getOneBlockHashByHeight(height: string | bigint): Promise<any> {
    const provider = await this._connectionManager.getCurrentAdapter();
    return await provider.getOneBlockHashByHeight(BigInt(height));
  }

  public async getOneBlockByHeight(height: string | bigint): Promise<any> {
    const provider = await this._connectionManager.getCurrentAdapter();
    return await provider.getOneBlockByHeight(BigInt(height));
  }

  public async getManyBlocksByHeights(heights: string[] | bigint[] | number[]): Promise<any> {
    const provider = await this._connectionManager.getCurrentAdapter();
    return await provider.getManyBlocksByHeights(heights.map((item) => BigInt(item)));
  }

  public async getOneBlockByHash(hash: string | Hash): Promise<any> {
    const provider = await this._connectionManager.getCurrentAdapter();
    // TODO: add method transform into Hash
    return await provider.getOneBlockByHash(hash as Hash);
  }

  public async getManyBlocksByHashes(hashes: string[] | Hash[]): Promise<any> {
    const provider = await this._connectionManager.getCurrentAdapter();
    // TODO: add method transform into Hash
    return await provider.getManyBlocksByHashes(hashes as Hash[]);
  }

  public async getOneTransactionByHash(hash: string | Hash): Promise<any> {
    const provider = await this._connectionManager.getCurrentAdapter();
    // TODO: add method transform into Hash
    return await provider.getOneTransactionByHash(hash as Hash);
  }

  public async getManyTransactionsByHashes(hashes: string[] | Hash[]): Promise<any> {
    const provider = await this._connectionManager.getCurrentAdapter();
    // TODO: add method transform into Hash
    return await provider.getManyTransactionsByHashes(hashes as Hash[]);
  }
}
