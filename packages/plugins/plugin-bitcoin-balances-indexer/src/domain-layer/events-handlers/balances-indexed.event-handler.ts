import { EventsHandler , IEventHandler} from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { BitcoinWalletsBatchBalancesIndexedEvent } from '@easylayer/domain-cqrs-components/bitcoin';
import { WalletsReadService, AddresesReadService, TransactionsReadService } from '../services';
import { WalletViewModel, AddressViewModel, TransactionViewModel } from '../view-models';

@EventsHandler(BitcoinWalletsBatchBalancesIndexedEvent)
export class BitcoinWalletsBatchBalancesIndexedEventHandler
  implements IEventHandler<BitcoinWalletsBatchBalancesIndexedEvent> {
    constructor(
      private readonly log: AppLogger,
      private readonly walletsReadService: WalletsReadService,
      private readonly addresesReadService: AddresesReadService,
      private readonly transactionsReadService: TransactionsReadService,
    ) {}

    // Add @Transctional()
    async handle(event: BitcoinWalletsBatchBalancesIndexedEvent) {
      const { aggregateId, balances } = event.payload;
      this.log.debug('handle()', event.payload, this.constructor.name);
  
      // const queryRunner = this.dataSource.createQueryRunner();
      // await queryRunner.connect();
      // await queryRunner.startTransaction();
  
      try {
        const walletsToSave: WalletViewModel[] = [];
        const addressesToSave: AddressViewModel[] = [];
        const transactionsToSave: TransactionViewModel[] = [];
  
        // Обработка каждого выхода
        for (const [key, walletData] of balances.entries()) {
          const [publicKey, address] = key.split(':');
  
          // Обновляем или создаем WalletViewModel
          let wallet = await this.walletsReadService.findOneById(publicKey).catch(() => null);
          if (!wallet) {
            wallet = new WalletViewModel();
            wallet.id = publicKey;
            wallet.addresses = [];
            walletsToSave.push(wallet);
          }
  
          // Обновляем или создаем AddressViewModel
          let addr = await this.addresesReadService.findOneById(address).catch(() => null);
          if (!addr) {
            addr = new AddressViewModel();
            addr.id = address;
            addr.wallet = wallet;
            addr.transactions = [];
            addr.nativeCoins = {};
            addr.nfts = {};
            addr.runes = {};
            wallet.addresses.push(addr);
            addressesToSave.push(addr);
          }
  
          // Обновляем nativeCoins
          for (const [addressKey, nativeCoin] of walletData.nativeCoins.entries()) {
            if (addr.nativeCoins[addressKey]) {
              addr.nativeCoins[addressKey].amount += nativeCoin.amount;
            } else {
              addr.nativeCoins[addressKey] = nativeCoin;
            }
          }
  
          // Обновляем nfts
          for (const [tokenId, nft] of walletData.nfts.entries()) {
            addr.nfts[tokenId] = nft;
          }
  
          // Обновляем runes
          for (const [runeType, rune] of walletData.runes.entries()) {
            if (addr.runes[runeType]) {
              addr.runes[runeType].value += rune.value;
            } else {
              addr.runes[runeType] = rune;
            }
          }
  
          // Создаем записи транзакций
          walletData.nativeCoins.forEach((_, addressKey) => {
            const transaction = new TransactionViewModel();
            transaction.id = addressKey;
            transaction.address = addr;
            transactionsToSave.push(transaction);
          });
  
          walletData.nfts.forEach((_, tokenId) => {
            const transaction = new TransactionViewModel();
            transaction.id = tokenId;
            transaction.address = addr;
            transactionsToSave.push(transaction);
          });
  
          walletData.runes.forEach((_, runeType) => {
            const transaction = new TransactionViewModel();
            transaction.id = runeType;
            transaction.address = addr;
            transactionsToSave.push(transaction);
          });
        }
  
        // Сохраняем обновленные WalletViewModel, AddressViewModel и TransactionViewModel
        // await queryRunner.manager.save(WalletViewModel, walletsToSave);
        // await queryRunner.manager.save(AddressViewModel, addressesToSave);
        // await queryRunner.manager.save(TransactionViewModel, transactionsToSave);
  
        // await queryRunner.commitTransaction();
      } catch (error) {
        // await queryRunner.rollbackTransaction();
        this.log.error('handle()', error, this.constructor.name);
      }
    }
}
