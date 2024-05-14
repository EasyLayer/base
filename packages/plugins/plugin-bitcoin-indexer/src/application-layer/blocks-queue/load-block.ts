// import { v4 as uuidv4 } from 'uuid';
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  BitcoinNetworkProviderModule,
  BitcoinNetworkProviderService,
  ProviderNodeOptions,
  ProviderOptions
} from '@easylayer/bitcoin-network-provider';

class ApplicationContextProvider {
  private static appContext: INestApplicationContext;

  // NOTE: A private constructor prevents the creation of a new instance of a class from outside
  private constructor() {}

  public static async getApplicationContext(providers: ProviderOptions[]): Promise<INestApplicationContext> {
    console.log("Checking if context exists");
      if (!this.appContext) {
        console.log("Creating new NestJS context");
        this.appContext = await NestFactory.createApplicationContext(
          BitcoinNetworkProviderModule.forRootAsync({
            providers
          }),
          { logger: false }
        );
      }

      return this.appContext;
  }
}

export const loadBlock = async ({
  height,
  providersConnectionOptions
}: {
  height: string | bigint;
  providersConnectionOptions: ProviderNodeOptions[];
}) => {

  const providers = providersConnectionOptions.map((connection: ProviderNodeOptions) => ({ connection }));

  const appContext = await ApplicationContextProvider.getApplicationContext(providers);
  const bitcoinService = appContext.get(BitcoinNetworkProviderService);

  // IMPORTANT: '2' means get block with all transactions objects
  return bitcoinService.getOneBlockByHeight(height, 2);
};