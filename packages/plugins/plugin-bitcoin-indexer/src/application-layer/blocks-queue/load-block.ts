// import { v4 as uuidv4 } from 'uuid';
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  BitcoinNetworkProviderModule,
  BitcoinNetworkProviderService,
  ProviderNodeOptions,
  ProviderOptions,
} from '@easylayer/bitcoin-network-provider';

class ApplicationContextProvider {
  private static appContext: INestApplicationContext | null;

  // NOTE: A private constructor prevents the creation of a new instance of a class from outside
  private constructor() {}

  public static async getApplicationContext(providers: ProviderOptions[]): Promise<INestApplicationContext> {
    if (!this.appContext) {
      this.appContext = await NestFactory.createApplicationContext(
        BitcoinNetworkProviderModule.forRootAsync({
          providers,
        }),
        { logger: false }
      );
    }

    return this.appContext;
  }

  public static async closeApplicationContext(): Promise<void> {
    if (this.appContext) {
      await this.appContext.close();
      this.appContext = null;
    }
  }
}

export const loadBlock = async ({
  height,
  providersConnectionOptions,
}: {
  height: string | number;
  providersConnectionOptions: ProviderNodeOptions[];
}) => {
  try {
    const providers = providersConnectionOptions.map((connection: ProviderNodeOptions) => ({ connection }));

    const appContext = await ApplicationContextProvider.getApplicationContext(providers);

    const bitcoinService = appContext.get(BitcoinNetworkProviderService);

    // IMPORTANT: '2' means get block with all transactions objects
    const block = await bitcoinService.getOneBlockByHeight(String(height), 2);

    return block;
  } catch (error) {
    throw error;
  }
};

process.on('SIGTERM', async () => {
  await ApplicationContextProvider.closeApplicationContext();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await ApplicationContextProvider.closeApplicationContext();
  process.exit(0);
});
