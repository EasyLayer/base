// import { v4 as uuidv4 } from 'uuid';
import { NestFactory } from '@nestjs/core';
import {
  BitcoinNetworkProviderModule,
  BitcoinNetworkProviderService,
  BitcoinNetworkProviderOptions
} from '@easylayer/bitcoin-network-provider';

export const loadBlock = async ({
  height,
  adapters
}: {
  height: string | bigint;
  adapters: BitcoinNetworkProviderOptions;
}) => {
    const appContext = await NestFactory.createApplicationContext(BitcoinNetworkProviderModule.forRootAsync(adapters));
    const bitcoinService = appContext.get(BitcoinNetworkProviderService);
    return bitcoinService.getOneBlockByHeight(height);
};