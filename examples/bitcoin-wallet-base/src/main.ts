import { bootstrap } from '@easylayer/bitcoin-wallet';

bootstrap({
  appName: 'base-wallet',
}).catch((error: Error) => console.error(error));