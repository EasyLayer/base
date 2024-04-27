import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/cqrs';
import { InitBitcoinNetworkCommand } from '@easylayer/domain-cqrs-components';

@Injectable()
export class BitcoinNetworkCommandFactoryService {
  constructor(
    private readonly commandBus: CommandBus
    // private readonly config: NetworkConfig
  ) {}

  public async init(dto: any): Promise<string> {
    const uuid = uuidv4();
    const result = await this.commandBus.execute(
      new InitBitcoinNetworkCommand({
        ...dto,
        uuid,
        // blockFromHeight: 0n,
        // blockHeight: 0n + BigInt(1), 
      })
    );
    return uuid;
      // indexedBlockHeight: result.indexedBlockHeight,
      // indexedBlockFromHeight: result.indexedBlockFromHeight,
  }
}
