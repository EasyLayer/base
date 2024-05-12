import { Injectable } from '@nestjs/common';
import { ConnectionManager } from './connection-manager';
import { Hash } from './node-providers';

@Injectable()
export class BitcoinNetworkProviderService {
  constructor(private _connectionManager: ConnectionManager) {}

  get connectionManager() {
    return this._connectionManager;
  }

  public async getCurrentBlockHeight(): Promise<bigint> {
    const provider = await this._connectionManager.getActiveProvider();
    return await provider.getBlockHeight();
  }

  public async getOneBlockHashByHeight(height: string | bigint): Promise<any> {
    const provider = await this._connectionManager.getActiveProvider();
    return await provider.getOneBlockHashByHeight(BigInt(height));
  }

  public async getOneBlockByHeight(height: string | bigint, verbosity?: number): Promise<any> {
    const provider = await this._connectionManager.getActiveProvider();
    return await provider.getOneBlockByHeight(BigInt(height), verbosity);
  }

  public async getManyBlocksByHeights(heights: string[] | bigint[] | number[]): Promise<any> {
    const provider = await this._connectionManager.getActiveProvider();
    return await provider.getManyBlocksByHeights(heights.map((item) => BigInt(item)));
  }

  public async getOneBlockByHash(hash: string | Hash): Promise<any> {
    const provider = await this._connectionManager.getActiveProvider();
    // TODO: add method transform into Hash
    return await provider.getOneBlockByHash(hash as Hash);
  }

  public async getManyBlocksByHashes(hashes: string[] | Hash[]): Promise<any> {
    const provider = await this._connectionManager.getActiveProvider();
    // TODO: add method transform into Hash
    return await provider.getManyBlocksByHashes(hashes as Hash[]);
  }

  public async getOneTransactionByHash(hash: string | Hash): Promise<any> {
    const provider = await this._connectionManager.getActiveProvider();
    // TODO: add method transform into Hash
    return await provider.getOneTransactionByHash(hash as Hash);
  }

  public async getManyTransactionsByHashes(hashes: string[] | Hash[]): Promise<any> {
    const provider = await this._connectionManager.getActiveProvider();
    // TODO: add method transform into Hash
    return await provider.getManyTransactionsByHashes(hashes as Hash[]);
  }
}
