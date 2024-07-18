import { Entity, PrimaryColumn, Column, JoinColumn, OneToMany, ManyToOne } from '@easylayer/read-database';
import { TransactionViewModel } from './transaction.view-model';

@Entity('blocks')
export class BlockViewModel {
  // NOTE: hash uniq and index
  @PrimaryColumn({ type: 'varchar' })
  public hash!: string;

  @Column({ type: 'bigint' })
  public height!: string;

  @Column({ type: 'varchar', nullable: true })
  public previousblockhash!: string;

  @Column({ type: 'varchar', nullable: true })
  public status!: string;

  @ManyToOne(() => BlockViewModel, (block) => block.nextBlocks)
  @JoinColumn({ name: 'previousblockhash', referencedColumnName: 'hash' })
  public prevBlock?: BlockViewModel;

  @OneToMany(() => BlockViewModel, (block) => block.prevBlock)
  public nextBlocks!: BlockViewModel[];

  @OneToMany(() => TransactionViewModel, (transaction) => transaction.block, {
    cascade: ['remove'],
  })
  public tx!: TransactionViewModel[];

  constructor(params?: any) {
    if (!params) return;

    this.hash = params.hash;
    this.status = params.status;
    this.height = params.height;
    this.previousblockhash = params.previousblockhash;
    this.tx = Array.isArray(params.tx) ? params.tx : [];
  }
}
