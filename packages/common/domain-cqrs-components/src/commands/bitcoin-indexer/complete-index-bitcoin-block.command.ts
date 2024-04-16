export interface ICompleteIndexBitcoinBlockCommand {
  transactionsPoolId: string;
  blockId: string;
}

export class CompleteIndexBitcoinBlockCommand {
  constructor(public readonly payload: ICompleteIndexBitcoinBlockCommand) {}
}
