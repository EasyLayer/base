import { Readable } from 'node:stream';
import axios, { AxiosInstance } from 'axios';
import rateLimit from 'axios-rate-limit';
import { parser } from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray';
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
        // TODO: we must also compare these values ​​with the number of workers and batches
      }),
      { maxRequests: 15, perMilliseconds: 1000 }
    );

    const health = await this.healthcheck();
    if (!health) {
      throw new Error('Cant connect');
    }
  }

  public async healthcheck(): Promise<boolean> {
    try {
      const response = await this._httpClient.post('/', {
        jsonrpc: '2.0',
        method: 'getblockchaininfo',
        params: [],
        id: 1,
      });

      return response.status === 200 && response.data.result !== undefined;
    } catch (error) {
      return false;
    }
  }

  public async disconnect() {}

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

  public async getOneBlockHashByHeight(height: number): Promise<Hash> {
    try {
      const data = {
        jsonrpc: '2.0',
        method: 'getblockhash',
        params: [height.toString()],
      };

      const response = await this._httpClient.post('/', data);
      const blockHash = response.data.result;
      return blockHash;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(
            `Server responded with status ${error.response.status}: ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          throw new Error('No response received from server');
        } else {
          throw new Error(`Error during request setup: ${error.message}`);
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
          throw new Error(
            `Server responded with status ${error.response.status}: ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          throw new Error('No response received from server');
        } else {
          throw new Error(`Error during request setup: ${error.message}`);
        }
      }

      throw error;
    }
  }

  public async getOneBlockByHeight(height: number, verbosity?: number): Promise<any> {
    const blockHash = await this.getOneBlockHashByHeight(height);
    const block = await this.getOneBlockByHash(blockHash, verbosity);
    return block;
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
          throw new Error(
            `Server responded with status ${error.response.status}: ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          throw new Error('No response received from server');
        } else {
          throw new Error(`Error during request setup: ${error.message}`);
        }
      }

      throw error;
    }
  }

  async getManyTransactionsByHashes(hashes: Hash[], verbosity?: number): Promise<any> {
    const transactions = [];

    for (const hash of hashes) {
      const tx = await this.getOneBlockByHash(hash, verbosity);
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
          throw new Error(
            `Server responded with status ${error.response.status}: ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          throw new Error('No response received from server');
        } else {
          throw new Error(`Error during request setup: ${error.message}`);
        }
      }

      throw error;
    }
  }

  public async getManyBlocksByHashes(hashes: string[], verbosity: number = 1): Promise<any> {
    try {
      const requests = hashes.map((hash, index) => ({
        jsonrpc: '2.0',
        method: 'getblock',
        params: [hash, verbosity],
        id: index,
      }));

      const response = await this._httpClient.post('/', requests);

      return response.data.map((item: any) => item.result);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(
            `Server responded with status ${error.response.status}: ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          throw new Error('No response received from server');
        } else {
          throw new Error(`Error during request setup: ${error.message}`);
        }
      }

      throw error;
    }
  }

  public async getManyHashesByHeights(heights: number[]): Promise<any> {
    try {
      const requests = heights.map((height, index) => ({
        jsonrpc: '2.0',
        method: 'getblockhash',
        params: [height],
        id: index,
      }));

      const response = await this._httpClient.post('/', requests);

      return response.data.map((item: any) => item.result);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(
            `Server responded with status ${error.response.status}: ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          throw new Error('No response received from server');
        } else {
          throw new Error(`Error during request setup: ${error.message}`);
        }
      }

      throw error;
    }
  }

  public async getManyBlocksByHeights(heights: number[], verbosity?: number): Promise<any> {
    const blocksHashes = await this.getManyHashesByHeights(heights);
    const blocks = await this.getManyBlocksByHashes(blocksHashes, verbosity);

    return blocks;
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
      const jsonParser = parser();

      const jsonStream = stream.pipe(jsonParser).pipe(new StreamArray());

      jsonStream.on('data', async ({ value }) => {
        try {
          await onDataCallback(value);
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
    });
  }
}
