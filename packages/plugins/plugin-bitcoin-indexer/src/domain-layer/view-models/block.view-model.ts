import { Entity, Column, JoinColumn, OneToMany, ManyToOne, PrimaryColumn } from '@easylayer/core/read-database';
import { TransactionViewModel } from './transaction.view-model';

@Entity('blocks')
export class BlockViewModel {
  // TODO: The autoinerment type must be passed from variables, since SQLite does not support bigint.
  // OR remove autoinerment and put some uuid

  @PrimaryColumn({ type: 'varchar' })
  public hash!: string;

  @Column({ type: 'integer' })
  public height!: number;

  @Column({ type: 'varchar', nullable: true })
  public previousblockhash!: string;

  @Column({ type: 'boolean', default: false })
  public is_suspended!: boolean;

  @ManyToOne(() => BlockViewModel, (block) => block.nextBlocks)
  @JoinColumn({ name: 'previousblockhash', referencedColumnName: 'hash' })
  public prevBlock?: BlockViewModel;

  @OneToMany(() => BlockViewModel, (block) => block.prevBlock)
  public nextBlocks!: BlockViewModel[];

  @OneToMany(() => TransactionViewModel, (transaction) => transaction.block, {
    cascade: ['remove'],
  })
  public tx!: TransactionViewModel[];
}
