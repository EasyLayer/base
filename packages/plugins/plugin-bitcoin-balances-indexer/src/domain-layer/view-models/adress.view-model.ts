import { Entity, PrimaryColumn, Column, Unique, Index, ManyToOne, OneToMany } from '@easylayer/read-database';
import { WalletViewModel } from './wallet.view-model';
import { TransactionViewModel } from './transaction.view-model';



@Entity('address_viewmodel')
@Index(['id'], { unique: true })
export class AddressViewModel {
    @PrimaryColumn({ type: 'varchar' })
    public id!: string; // address

    // public publicKey!: 

    @ManyToOne(() => WalletViewModel, wallet => wallet.addresses)
    public wallet!: WalletViewModel;

    @OneToMany(() => TransactionViewModel, transaction => transaction.address)
    public transactions!: TransactionViewModel[];

    @Column({ type: 'jsonb' })
    public nativeCoins!: any;

    @Column({ type: 'jsonb' })
    public nfts!: any;

    @Column({ type: 'jsonb' })
    public runes!: any;
}