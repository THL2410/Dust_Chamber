
import {
  Column,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { DesignInputs } from './DesignInputs';
import { DesignResults } from './DesignResults';

@Index('idx_design_projects_created_at', ['createdAt'], {})
@Index('design_projects_pkey', ['id'], { unique: true })
@Index('idx_design_projects_user_id', ['userId'], {})
@Entity('design_projects', { schema: 'public' })
export class DesignProjects {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('integer', { name: 'user_id' })
  userId: number;

  @Column('character varying', { name: 'name', length: 200 })
  name: string;

  @Column('enum', { name: 'mode', enum: ['CHECK', 'DESIGN'] })
  mode: 'CHECK' | 'DESIGN';

  @Column('text', { name: 'note', nullable: true })
  note: string | null;

  @Column('smallint', { name: 'formula_version', default: () => '1' })
  formulaVersion: number;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('timestamp with time zone', {
    name: 'updated_at',
    default: () => 'now()',
  })
  updatedAt: Date;

  @OneToOne(() => DesignInputs, (designInputs) => designInputs.project)
  designInputs: DesignInputs;

  @OneToOne(() => DesignResults, (designResults) => designResults.project)
  designResults: DesignResults;
}
