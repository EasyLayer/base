import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/cqrs';
import { BitcoinParseBlockCommand } from '@easylayer/domain-cqrs-components';

@Injectable()
export class BitcoinParserCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}

  public async parseBlock(dto: any): Promise<{ uuid: string }> {
    const uuid = uuidv4();
    await this.commandBus.execute(new BitcoinParseBlockCommand({ ...dto, uuid }));
    return { uuid };
  }
}
