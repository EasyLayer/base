import axios from 'axios';
import { BaseNodeProvider, BaseNodeProviderOptions } from './base-node-provider';
import { NodeProviderTypes, Hash } from './interfaces';

export interface SelfNodeProviderOptions extends BaseNodeProviderOptions {
  host: string;
  port: number;
  username: string;
  password: string;
}

export const createSelfNodeProvider = (options: SelfNodeProviderOptions): SelfNodeProvider => {
  return new SelfNodeProvider(options);
};

export class SelfNodeProvider extends BaseNodeProvider<SelfNodeProviderOptions> {
  readonly type: NodeProviderTypes = 'selfnode';
  private _httpClient: any;
  host: string;
  port: number;
  username: string;
  password: string;

  constructor(options: SelfNodeProviderOptions) {
    super(options);
    this.host = options.host;
    this.port = options.port;
    this.username = options.username;
    this.password = options.password;
    console.log(options);
  }

  get connectionOptions() {
    return {
      type: this.type,
      uniqName: this.uniqName,
      host: this.host,
      port: this.port,
      username: this.username,
      password: this.password,
    };
  }

  public async connect() {
    this._httpClient = axios.create({
      baseURL: `http://${this.host}:${this.port}`,
      auth: {
        username: this.username,
        password: this.password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const health = await this.healthcheck();
    if (!health) {
      throw new Error('Cant connect');
    }
  }

  public async healthcheck(): Promise<boolean> {
    try {
      return true;
      // const response = await this._httpClient.post('/', {
      //   jsonrpc: '2.0',
      //   method: 'getblockchaininfo',
      //   params: [],
      //   id: 1,
      // });

      // return response.status === 200;
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
}
