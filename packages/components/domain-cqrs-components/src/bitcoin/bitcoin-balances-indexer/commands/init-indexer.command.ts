export interface IInitIndexerCommand {
  requestId: string;
  startHeight: string | number;
  restoreFromHeight: number;
}

export class InitIndexerCommand {
  constructor(public readonly payload: IInitIndexerCommand) {}
}
