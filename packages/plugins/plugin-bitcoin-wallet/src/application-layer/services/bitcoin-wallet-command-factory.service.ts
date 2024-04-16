import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/cqrs';
import { BitcoinUpdateDepositCommand } from '@easylayer/domain-cqrs-components';

@Injectable()
export class BitcoinWalletCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}

  public async updateDeposit(dto: any): Promise<void> {
    await this.commandBus.execute(new BitcoinUpdateDepositCommand({ ...dto }));
  }

  public async compensatingAction(dto: any): Promise<void> {
    console.log('compensatingAction\n', dto);
  }
}
