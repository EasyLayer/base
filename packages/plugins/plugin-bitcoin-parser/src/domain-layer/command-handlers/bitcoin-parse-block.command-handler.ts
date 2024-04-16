import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { BitcoinParseBlockCommand } from '@easylayer/domain-cqrs-components';
import { AppLogger } from '@easylayer/logger';
import { Block } from '../models/block.model';
import { BitcoinBlockModelFactoryService } from '../services/bitcoin-block-model-factory.service';

@CommandHandler(BitcoinParseBlockCommand)
export class BitcoinParseBlockCommandHandler implements ICommandHandler<BitcoinParseBlockCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly modelFactory: BitcoinBlockModelFactoryService
  ) {}

  async execute({ payload }: BitcoinParseBlockCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { block } = payload;

      const blockModel: Block = this.modelFactory.createNewModel();

      const params = { aggregateId: 'uuid', block };
      blockModel.parseBlock(params);

      await blockModel.commit();

      this.log.debug('Block successfull parsed', params, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
