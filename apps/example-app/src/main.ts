import { bootstrap } from '@easylayer/core';

import BitcoinIndexer from '@easylayer/plugin-bitcoin-indexer';

bootstrap({
    appName: 'example-app',
    plugins: [BitcoinIndexer]
})//.catch((error) => console.error(error));
