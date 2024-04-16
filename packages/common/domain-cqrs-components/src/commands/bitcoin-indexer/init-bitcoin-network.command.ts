export interface IInitBitcoinNetworkCommand {
  uuid: string;
  blockFromHeight: bigint;
  blockHeight: bigint;
}

export class InitBitcoinNetworkCommand {
  constructor(public readonly payload: IInitBitcoinNetworkCommand) {}
}
