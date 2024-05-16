import { Entity, PrimaryColumn, Column, Unique, Index } from '@easylayer/read-database';

@Entity('transaction_viewmodel')
// @Unique(['requestId', 'id'])
@Index(['id'], { unique: true })
export class TransactionViewModel {
    @PrimaryColumn({ type: 'varchar' })
    public id!: string; // txid

    @Column({ type: 'varchar' })
    public hash!: string;
}