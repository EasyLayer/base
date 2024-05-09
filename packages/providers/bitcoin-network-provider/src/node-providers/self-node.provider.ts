import { BitcoinCoreConnectionOptions, Client } from 'bitcoin-core';
import { BaseNodeProvider } from './base-node-provider';
import { BaseProviderNodeOptions } from './interfaces';

export interface SelfNodeProviderOptions extends BitcoinCoreConnectionOptions, BaseProviderNodeOptions {
  host: string;
  port: number;
  secureConnection: boolean;
}

export const createSelfNodeProvider = (options: SelfNodeProviderOptions): SelfNodeProvider => {
  return new SelfNodeProvider(options);
}

export class SelfNodeProvider extends BaseNodeProvider<SelfNodeProviderOptions> {
  private _httpClient!: Client;

  constructor(options: SelfNodeProviderOptions) {
    super(options);
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
