import { bootstrap } from '@easylayer/base';

import BitcoinIndexer from '@easylayer/plugin-bitcoin-indexer';
// import BitcoinBalancesIndexer from '@easylayer/plugin-bitcoin-balances-indexer';

bootstrap({
  appName: 'example-app',
  plugins: [
    // BitcoinBalancesIndexer,
    BitcoinIndexer,
  ],
  isAutoImportDisable: true
}); //.catch((error) => console.error(error));
