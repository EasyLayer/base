import { Entity, PrimaryColumn, Column, Unique, Index } from '@easylayer/read-database';

@Entity('block_viewmodel')
// @Unique(['requestId', 'id'])
@Index(['id'], { unique: true })
export class BlockViewModel {
    @PrimaryColumn({ type: 'varchar' }) // TODO: change for bigint 
    public id!: string; // aggregateId (block height)

    @Column({ type: 'varchar' })
    public hash!: string;
}