export interface IInitIndexerCommand {
  requestId: string;
}

export class InitIndexerCommand {
  constructor(public readonly payload: IInitIndexerCommand) {}
}
