import { v4 as uuidv4 } from 'uuid';
import { NestFactory } from '@nestjs/core';
import { BitcoinNetworkProviderModule, BitcoinNetworkProviderService, QuickNodeAdapter } from '@easylayer/bitcoin-network-provider';

export const load = async ({
    heigh,
    options
}: {
    heigh: string | bigint;
    options: any;
}) => {
    // Create QuickNode providers
    const quickNodeProvidersFactories = [];
    for (const quickNodeProvider of options.QUICK_NODE_BASE_URLS) {
      quickNodeProvidersFactories.push({
        useFactory: () =>
          new QuickNodeAdapter({
            name: uuidv4(), // random name //'Quick Node Bitcoin',
            baseUrl: quickNodeProvider,
          }),
      });
    }

    const appContext = await NestFactory.createApplicationContext(BitcoinNetworkProviderModule.forRootAsync([...quickNodeProvidersFactories]));
    const bitcoinService = appContext.get(BitcoinNetworkProviderService);
    return bitcoinService.getOneBlockByHeight(heigh);
};