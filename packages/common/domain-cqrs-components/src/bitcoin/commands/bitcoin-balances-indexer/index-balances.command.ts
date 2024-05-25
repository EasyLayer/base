export interface IIndexBalancesCommand {
    batch: any;
    requestId: string;
}

export class IndexBalancesCommand {
    constructor(public readonly payload: IIndexBalancesCommand) {}
}
  