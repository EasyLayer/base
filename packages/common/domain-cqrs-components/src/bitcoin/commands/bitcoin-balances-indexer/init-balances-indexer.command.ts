export interface IInitBalancesIndexerCommand {
  requestId: string;
}

export class InitBalancesIndexerCommand {
  constructor(public readonly payload: IInitBalancesIndexerCommand) {}
}
