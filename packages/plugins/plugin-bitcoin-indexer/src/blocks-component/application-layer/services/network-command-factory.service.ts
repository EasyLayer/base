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

  public async init(dto: any): Promise<{ indexedBlockHeight: bigint; indexedBlockFromHeight: bigint }> {
    const result = await this.commandBus.execute(
      new InitBitcoinNetworkCommand({
        ...dto,
        uuid: uuidv4(),
        blockFromHeight: 0n,
        blockHeight: 0n + BigInt(1),
      })
    );
    return {
      indexedBlockHeight: result.indexedBlockHeight,
      indexedBlockFromHeight: result.indexedBlockFromHeight,
    };
  }
}
