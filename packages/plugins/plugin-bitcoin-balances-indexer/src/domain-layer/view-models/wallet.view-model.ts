import { Entity, PrimaryColumn, Column, OneToMany, Index } from '@easylayer/read-database';
import { AddressViewModel } from './adress.view-model';

@Entity('wallet_viewmodel')
@Index(['id'], { unique: true })
export class WalletViewModel {
    @PrimaryColumn({ type: 'varchar' })
    public id!: string; // publicKey

    @OneToMany(() => AddressViewModel, address => address.wallet)
    public addresses!: AddressViewModel[];
}