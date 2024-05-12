// import { v4 as uuidv4 } from 'uuid';
import { NestFactory } from '@nestjs/core';
import {
  BitcoinNetworkProviderModule,
  BitcoinNetworkProviderService,
  ProviderNodeOptions,
  ProviderOptions
} from '@easylayer/bitcoin-network-provider';

export const loadBlock = async ({
  height,
  providersConnectionOptions
}: {
  height: string | bigint;
  providersConnectionOptions: ProviderNodeOptions[];
}) => {

  const providers: ProviderOptions[] = providersConnectionOptions.map((connection: ProviderNodeOptions) => {
    return { connection }
  });

  const appContext = await NestFactory.createApplicationContext(
    BitcoinNetworkProviderModule.forRootAsync({
      providers
    })
  );
  const bitcoinService = appContext.get(BitcoinNetworkProviderService);


  return bitcoinService.getOneBlockByHeight(height, 2);
};