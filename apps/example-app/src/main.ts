import { bootstrap } from '@easylayer/core';

import BitcoinIndexer from '@easylayer/plugin-bitcoin-indexer';
// import BitcoinBalancesIndexer from '@easylayer/plugin-bitcoin-balances-indexer';

bootstrap({
  appName: 'example-app',
  plugins: [
    // BitcoinBalancesIndexer
    BitcoinIndexer,
  ],
}); //.catch((error) => console.error(error));
