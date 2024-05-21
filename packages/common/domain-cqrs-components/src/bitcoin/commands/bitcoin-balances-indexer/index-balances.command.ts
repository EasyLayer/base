export interface IIndexBalancesCommand {
    blockHeight: string;
    blockHash: string;
    transactions: any;
    requestId: string;
    batchId: string
}
  
export class IndexBalancesCommand {
    constructor(public readonly payload: IIndexBalancesCommand) {}
}
  