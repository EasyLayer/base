// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/core/cqrs';
import {
  InitListenerCommand,
  ProcessReorganisationCommand,
} from '@easylayer/components/domain-cqrs-components/bitcoin-listener';

@Injectable()
export class ListenerCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}

  public async init(dto: any): Promise<void> {
    return await this.commandBus.execute(new InitListenerCommand(dto));
  }

  public async processReorganisation(dto: any): Promise<void> {
    return await this.commandBus.execute(new ProcessReorganisationCommand(dto));
  }
}
