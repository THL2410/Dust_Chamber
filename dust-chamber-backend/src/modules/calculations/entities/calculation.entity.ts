import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Persistence model for a calculation record.
 *
 * Coordination note: this entity is intentionally not wired into the
 * calculations service yet, to avoid duplicating the History module's table.
 * Agree on table ownership/schema with the History and Database teammates
 * before registering it with TypeOrmModule or generating a migration.
 */
@Entity({ name: 'calculations' })
export class CalculationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'jsonb' })
  input!: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  result!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
