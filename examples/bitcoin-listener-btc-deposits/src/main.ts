import { bootstrap } from '@easylayer/bitcoin-listener';
import { EventsMapper } from './mapper';
import { initializeWebSocket } from './ws';

bootstrap({
  appName: 'listener-btc-deposits',
  mapper: EventsMapper
})
.then(() => initializeWebSocket())
.catch((error: Error) => console.error(error));