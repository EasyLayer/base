export interface Transaction {
  txid: string;
  hash: string;
  vin: any;
  vout: any;
}
// TODO: move to provider
export interface Block {
  height: bigint;
  hash: string;
  tx: Transaction[];
}
