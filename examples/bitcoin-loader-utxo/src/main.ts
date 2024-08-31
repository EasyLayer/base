import { bootstrap } from '@easylayer/bitcoin-loader';
import { OutputSchema, InputSchema } from './models';
import { Mapper } from './mapper';

bootstrap({
  appName: 'utxo-loader',
  schemas: [OutputSchema, InputSchema],
  mapper: Mapper,
  isServer: true
}).catch((error: Error) => console.error(error));