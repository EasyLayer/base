export interface IRollbackBalancesCommand {
    batches: any;
    reorganisationHeight: bigint;
    requestId: string;
    blockHeight: bigint;
    blockHash: string;
}

export class RollbackBalancesCommand {
    constructor(public readonly payload: IRollbackBalancesCommand) {}
}
  