import { Entity, PrimaryColumn, Column, Index, OneToMany } from '@easylayer/read-database';
import { TransactionViewModel } from './transaction.view-model';

@Entity('blocks')
@Index(['hash'], { unique: true })
export class BlockViewModel {

    // TODO: add id column

    @PrimaryColumn({ type: 'varchar' })
    public hash!: string;

    @Column({ type: 'varchar', nullable: true })
    public status!: string;

    @OneToMany(() => TransactionViewModel, transaction => transaction.block, {
        cascade: true
    })
    public transactions!: TransactionViewModel[];

    constructor(params?: any) {

        if (!params) return;

        this.hash = params.hash;
        this.status = params.status;
        this.transactions = Array.isArray(params.transations) ? params.transaction : [];
    }
}
