import { bootstrap } from '@easylayer/bitcoin-loader';
import { BlockSchema, TransactionSchema } from './models';
import { Mapper } from './mapper';

bootstrap({
  appName: 'blocks-loader',
  schemas: [BlockSchema, TransactionSchema],
  mapper: Mapper,
  isServer: true
}).catch((error: Error) => console.error(error));