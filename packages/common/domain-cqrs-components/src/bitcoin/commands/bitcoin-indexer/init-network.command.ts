export interface IInitNetworkCommand {
  requestId: string;
}

export class InitNetworkCommand {
  constructor(public readonly payload: IInitNetworkCommand) {}
}
