import { Module } from '@nestjs/common';
import { NETWORK_TRANSPORT_SERVICE } from '@easylayer/components/shared-interfaces';
import { NetworkTransportService } from './network-transport.service';

@Module({
  imports: [],
  providers: [
    {
      provide: NETWORK_TRANSPORT_SERVICE,
      useClass: NetworkTransportService,
    },
  ],
  exports: [NETWORK_TRANSPORT_SERVICE],
})
export class NetworkTransportModule {}
