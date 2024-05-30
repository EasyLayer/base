import { Entity, PrimaryColumn, Column, Unique, Index } from '@easylayer/read-database';

@Entity('block_viewmodel')
// @Unique(['requestId', 'id'])
@Index(['id'], { unique: true })
export class BlockViewModel {
    @PrimaryColumn({ type: 'varchar' })
    public id!: string; // aggregateId (block hash)

    @Column({ type: 'varchar' })
    public hash!: string;

    @Column({ type: 'varchar' })
    public status!: string;
}