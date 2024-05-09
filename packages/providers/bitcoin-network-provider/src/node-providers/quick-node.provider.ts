import axios, { AxiosInstance, AxiosError } from 'axios';
import rateLimit from 'axios-rate-limit';
import { BaseNodeProvider, Hash } from './base-node-provider';
import { BaseProviderNodeOptions } from './interfaces';

export interface QuickNodeProviderOptions extends BaseProviderNodeOptions {
  baseUrl: string;

}

export const createQuickNodeProvider = (options: QuickNodeProviderOptions): QuickNodeProvider => {
  return new QuickNodeProvider(options);
}

export class QuickNodeProvider extends BaseNodeProvider<QuickNodeProviderOptions> {
  private _httpClient!: AxiosInstance;

  constructor(options: QuickNodeProviderOptions) {
    super(options);
  }

  public async connect() {
    // this._httpClient = new Core({
    //   // chain: {
    //   //   testnet: true
    //   // },
    //   endpointUrl: this.connectionOptions.baseUrl,
    // })

    this._httpClient = rateLimit(axios.create({
      baseURL: this.connectionOptions.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      // TODO: add to envs
    }), { maxRequests: 10, perMilliseconds: 1000 });

    if (!this.healthcheck()) {
      throw new Error('Cant connect');
    }
  }

  public async disconnect() {}

  public async healthcheck(): Promise<boolean> {
    if (!this._httpClient) return false;

    try {
      return true;
      // this._httpClient.client.;
    } catch (error) {
      return false;
    }
  }

  public async getBlockHeight(): Promise<bigint> {
    try {
      const data = {
        jsonrpc: '2.0',
        method: 'getblockcount',
      };

      const response = await this._httpClient.post('/', data);
      const blockHeight = response.data.result;
      return blockHeight;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw error.response?.data;
      }
      throw error;
    }
  }

  public async getOneBlockHashByHeight(height: string | bigint): Promise<Hash> {
    try {
      const data = {
        jsonrpc: '2.0',
        method: 'getblockhash',
        params: [+height.toString()],
      };

      const response = await this._httpClient.post('/', data);
      const blockHash = response.data.result;
      return blockHash;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw error.response?.data;
      }
      throw error;
    }
  }

  public async getOneBlockByHash(hash: Hash): Promise<any> {
    try {
      const data = {
        jsonrpc: '2.0',
        method: 'getblock',
        params: [hash, 1],
      };

      const response = await this._httpClient.post('/', data);
      const block = response.data.result;
      return block;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw error.response?.data;
      }
      throw error;
    }
  }

  public async getManyBlocksByHashes(hashes: Hash[]): Promise<any> {
    const blocks = [];

    for (const hash of hashes) {
      const block = await this.getOneBlockByHash(hash);
      blocks.push(block);
    }

    return blocks;
  }

  public async getOneBlockByHeight(height: string | bigint): Promise<any> {
    const blockHash = await this.getOneBlockHashByHeight(height);
    const block = await this.getOneBlockByHash(blockHash);
    return block;
  }

  public async getManyBlocksByHeights(heights: string[] | bigint[]): Promise<any> {
    const blocks = [];

    for (const height of heights) {
      const blockHash = await this.getOneBlockHashByHeight(height);
      const block = await this.getOneBlockByHash(blockHash);
      blocks.push(block);
    }

    return blocks;
  }

  async getOneTransactionByHash(hash: Hash): Promise<any> {
    try {
      const data = {
        jsonrpc: '2.0',
        method: 'getrawtransaction',
        params: [hash, 2], //1
      };

      const response = await this._httpClient.post('/', data);
      const block = response.data.result;
      return block;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw error.response?.data;
      }
      throw error;
    }
  }

  async getManyTransactionsByHashes(hashes: Hash[]): Promise<any> {
    const transactions = [];

    for (const hash of hashes) {
      const tx = await this.getOneBlockByHash(hash);
      transactions.push(tx);
    }

    return transactions;
  }

  public async sendTransaction() {}

  public async findOneTransaction() {}

  public async findManyTransactions() {}
}
