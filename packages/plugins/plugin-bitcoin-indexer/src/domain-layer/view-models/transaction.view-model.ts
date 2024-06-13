import { Entity, PrimaryColumn, Column, ManyToOne, Index } from '@easylayer/read-database';
import { BlockViewModel } from './block.view-model';

@Entity('transactions')
@Index(['txid'], { unique: true })
export class TransactionViewModel {

    // TODO: add id column

    @PrimaryColumn({ type: 'varchar' })
    public txid!: string;

    @Column({ type: 'varchar', nullable: true })
    public status!: string;

    @ManyToOne(() => BlockViewModel, block => block.transactions)
    public block!: BlockViewModel;

    constructor(params?: any) {

        if (!params) return;

        this.txid = params.txid;
        this.status = params.status;
        this.block = params.block;
    }
}
