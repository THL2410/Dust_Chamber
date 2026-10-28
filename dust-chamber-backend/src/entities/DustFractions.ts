import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DesignProjects } from "./DesignProjects";
import { FractionResults } from "./FractionResults";

@Index("dust_fractions_pkey", ["id"], { unique: true })
@Index("uq_fraction_order", ["projectId", "sortOrder"], { unique: true })
@Entity("dust_fractions", { schema: "public" })
export class DustFractions {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "project_id", unique: true })
  projectId: number;

  @Column("smallint", { name: "sort_order", unique: true })
  sortOrder: number;

  @Column("double precision", { name: "d_from_um", precision: 53 })
  dFromUm: number;

  @Column("double precision", {
    name: "d_to_um",
    nullable: true,
    precision: 53,
  })
  dToUm: number | null;

  @Column("double precision", { name: "mass_percent", precision: 53 })
  massPercent: number;

  @ManyToOne(
    () => DesignProjects,
    (designProjects) => designProjects.dustFractions,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "project_id", referencedColumnName: "id" }])
  project: DesignProjects;

  @OneToOne(
    () => FractionResults,
    (fractionResults) => fractionResults.fraction
  )
  fractionResults: FractionResults;
}
