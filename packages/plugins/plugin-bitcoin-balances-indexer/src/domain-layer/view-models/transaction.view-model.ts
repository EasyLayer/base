import { Entity, PrimaryColumn, Column, ManyToOne, Index } from '@easylayer/read-database';
import { AddressViewModel } from './adress.view-model';

@Entity('transaction_viewmodel')
@Index(['id'], { unique: true })
export class TransactionViewModel {
    @PrimaryColumn({ type: 'varchar' })
    public id!: string; // txid

    @ManyToOne(() => AddressViewModel, address => address.transactions)
    public address!: AddressViewModel;
}