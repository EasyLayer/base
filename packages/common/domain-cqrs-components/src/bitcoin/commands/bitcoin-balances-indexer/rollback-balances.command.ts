export interface IRollbackBalancesCommand {
    batch: any;
    requestId: string;
}

export class RollbackBalancesCommand {
    constructor(public readonly payload: IRollbackBalancesCommand) {}
}
  