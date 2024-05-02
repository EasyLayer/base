export interface IBitcoinSendNotificationCommand {
  aggregateId: string;
  type: string;
}

export class BitcoinSendNotificationCommand {
  constructor(public readonly payload: IBitcoinSendNotificationCommand) {}
}
