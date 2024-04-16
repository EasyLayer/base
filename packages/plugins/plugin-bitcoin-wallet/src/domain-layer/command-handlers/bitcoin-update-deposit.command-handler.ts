import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { BitcoinUpdateDepositCommand } from '@easylayer/domain-cqrs-components';
import { AppLogger } from '@easylayer/logger';
import { BitcoinWalletModelFactoryService } from '../services';

@CommandHandler(BitcoinUpdateDepositCommand)
export class BitcoinUpdateDepositCommandHandler implements ICommandHandler<BitcoinUpdateDepositCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly modelFactory: BitcoinWalletModelFactoryService
  ) {}

  async execute({ payload }: BitcoinUpdateDepositCommand) {
    try {
      const delay = (timeInMs: number) => new Promise((resolve) => setTimeout(resolve, timeInMs));
      await delay(3000);
      this.log.debug('3execute()', payload, this.constructor.name);

      const {} = payload;

      // const walletModel = this.modelFactory.createNewModel();
      // // const walletModel = await this.modelFactory.initExistingModel(aggregateId);

      // const params = { aggregateId, value: 10 };
      // walletModel.deposit(params);

      // await walletModel.commit();

      // this.log.debug(`7Deposit successfull updated`, params, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
