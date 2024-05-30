
export interface IIndexBalancesCommand {
    batch: any; //: { transactions, index, isFinalBatch }
    requestId: string;
    blockHeight: bigint;
    blockHash: string;
}

export class IndexBalancesCommand {
    constructor(public readonly payload: IIndexBalancesCommand) {}
}
  