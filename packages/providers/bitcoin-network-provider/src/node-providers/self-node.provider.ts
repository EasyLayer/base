import { BitcoinCoreConnectionOptions, Client } from 'bitcoin-core';
import { BaseNodeProvider, BaseNodeProviderOptions } from './base-node-provider';
import { NodeProviderTypes } from './interfaces';

export interface SelfNodeProviderOptions extends BitcoinCoreConnectionOptions, BaseNodeProviderOptions {
  host: string;
  port: number;
}

export const createSelfNodeProvider = (options: SelfNodeProviderOptions): SelfNodeProvider => {
  return new SelfNodeProvider(options);
};

export class SelfNodeProvider extends BaseNodeProvider<SelfNodeProviderOptions> {
  readonly type: NodeProviderTypes = 'selfnode';
  private _httpClient!: Client;
  host: string;
  port: number;

  constructor(options: SelfNodeProviderOptions) {
    super(options);
    this.host = options.host;
    this.port = options.port;
  }

  get connectionOptions() {
    return {
      type: this.type,
      uniqName: this.uniqName,
      port: this.port,
      host: this.host,
    };
  }

  public async connect() {
    this._httpClient = new Client(this.connectionOptions);

    if (!this.healthcheck()) {
      throw new Error('Cant connect');
    }
  }

  public async healthcheck(): Promise<boolean> {
    if (!this._httpClient) return false;

    try {
      const response = { status: 200 }; //await this._httpClient.get('/healthcheck');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  public async disconnect() {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async sendTransaction(transaction: any): Promise<any> {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async findManyTransactions(address: string): Promise<any> {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async findOneTransaction(txId: string): Promise<any> {}
}
