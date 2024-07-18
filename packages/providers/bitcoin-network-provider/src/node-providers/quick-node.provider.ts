import { Readable } from 'node:stream';
import axios, { AxiosInstance } from 'axios';
import rateLimit from 'axios-rate-limit';
import * as JSONStream from 'JSONStream';
import { BaseNodeProvider, BaseNodeProviderOptions } from './base-node-provider';
import { Hash, NodeProviderTypes } from './interfaces';

export interface QuickNodeProviderOptions extends BaseNodeProviderOptions {
  baseUrl: string;
}

export const createQuickNodeProvider = (options: QuickNodeProviderOptions): QuickNodeProvider => {
  return new QuickNodeProvider(options);
};

export class QuickNodeProvider extends BaseNodeProvider<QuickNodeProviderOptions> {
  private _httpClient!: AxiosInstance;

  readonly type: NodeProviderTypes = 'quicknode';
  baseUrl!: string;

  constructor(options: QuickNodeProviderOptions) {
    super(options);
    this.baseUrl = options.baseUrl;
  }

  get connectionOptions() {
    return {
      type: this.type,
      uniqName: this.uniqName,
      baseUrl: this.baseUrl,
    };
  }

  public async connect() {
    this._httpClient = rateLimit(
      axios.create({
        baseURL: this.connectionOptions.baseUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        // TODO: add to envs
        // TODO: мы также должны эти значения сопоставлять с количеством воркеров...
      }),
      { maxRequests: 30, perMilliseconds: 1000 }
    );

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

  public async getBlockHeight(): Promise<number> {
    try {
      const data = {
        jsonrpc: '2.0',
        method: 'getblockcount',
      };

      const response = await this._httpClient.post('/', data);
      const blockHeight = response.data.result;
      return Number(blockHeight);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Error: ${error.response.data}`);
        } else if (error.request) {
          throw new Error('No response received from server');
        } else {
          throw new Error(error.message);
        }
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
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Error: ${error.response.data}`);
        } else if (error.request) {
          throw new Error('No response received from server');
        } else {
          throw new Error(error.message);
        }
      }

      throw error;
    }
  }

  public async getOneBlockByHash(hash: Hash, verbosity: number = 1): Promise<any> {
    try {
      const data = {
        jsonrpc: '2.0',
        method: 'getblock',
        params: [hash, verbosity],
      };

      const response = await this._httpClient.post('/', data);
      const block = response.data.result;
      return block;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Error: ${error.response.data}`);
        } else if (error.request) {
          throw new Error('No response received from server');
        } else {
          throw new Error(error.message);
        }
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

  public async getOneBlockByHeight(height: string | bigint, verbosity?: number): Promise<any> {
    const blockHash = await this.getOneBlockHashByHeight(height);
    const block = await this.getOneBlockByHash(blockHash, verbosity);
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
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Error: ${error.response.data}`);
        } else if (error.request) {
          throw new Error('No response received from server');
        } else {
          throw new Error(error.message);
        }
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

  public async createWebhookStream(streamConfig: any): Promise<any> {
    try {
      const response = await this._httpClient.post('/streams', streamConfig);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Error: ${error.response.data}`);
        } else if (error.request) {
          throw new Error('No response received from server');
        } else {
          throw new Error(error.message);
        }
      }

      throw error;
    }
  }

  // public async updateWebhookStream(streamId: string, streamConfig: any): Promise<any> {
  //   try {
  //     const response = await this._httpClient.put(`/streams/${streamId}`, streamConfig);
  //     return response.data;
  //   } catch (error) {
  //     if (axios.isAxiosError(error)) {
  //       if (error.response) {
  //         throw new Error(`Error: ${error.response.data}`);
  //       } else if (error.request) {
  //         throw new Error('No response received from server');
  //       } else {
  //         throw new Error(error.message);
  //       }
  //     }

  //     throw error;
  //   }
  // }

  public async deleteWebhookStream(streamId: string): Promise<any> {
    try {
      const response = await this._httpClient.delete(`/streams/${streamId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Error: ${error.response.data}`);
        } else if (error.request) {
          throw new Error('No response received from server');
        } else {
          throw new Error(error.message);
        }
      }

      throw error;
    }
  }

  // public async pauseWebhookStream(streamId: string): Promise<any> {
  //   try {
  //     const response = await this._httpClient.delete(`/streams/${streamId}`);
  //     return response.data;
  //   } catch (error) {
  //     if (axios.isAxiosError(error)) {
  //       if (error.response) {
  //         throw new Error(`Error: ${error.response.data}`);
  //       } else if (error.request) {
  //         throw new Error('No response received from server');
  //       } else {
  //         throw new Error(error.message);
  //       }
  //     }

  //     throw error;
  //   }
  // }

  public async handleWebhookStream({
    stream,
    onDataCallback,
    onFinishCallback,
    onErrorCallback,
  }: {
    stream: Readable;
    onDataCallback: (block: any) => Promise<void>;
    onFinishCallback: () => void;
    onErrorCallback: (error: any) => void;
  }): Promise<NodeJS.ReadWriteStream> {
    return new Promise((resolve, reject) => {
      const jsonStream = JSONStream.parse('*');

      jsonStream.on('data', async (data: any) => {
        try {
          await onDataCallback(data);
        } catch (error) {
          onErrorCallback(error);
        }
      });

      jsonStream.on('end', () => {
        onFinishCallback();
        resolve(jsonStream);
      });

      jsonStream.on('error', (error: any) => {
        onErrorCallback(error);
        reject(error);
      });

      stream.pipe(jsonStream);
    });
  }
}
