import { BlockchainEvent } from '@easylayer/bitcoin-listener';

export class BlockEvent implements BlockchainEvent {
  type: string = 'newblock';
  data: any;

  constructor(data: any) {
    this.data = data;
  }
}

export class TransactionEvent implements BlockchainEvent {
    type: string = 'newtx';
    data: any;
  
    constructor(data: any) {
      this.data = data;
    }
}
