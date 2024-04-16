export interface ICreateBitcoinWalletsBatchCommand {
  uuid: string;
  // transactionId: string;
  // wallets: any[];
  transactions: any[];
  transactionBatchId: string;
}

export class CreateBitcoinWalletsBatchCommand {
  constructor(public readonly payload: ICreateBitcoinWalletsBatchCommand) {}
}
