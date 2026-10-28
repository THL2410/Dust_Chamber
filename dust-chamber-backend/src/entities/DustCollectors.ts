import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FractionResults } from "./FractionResults";

@Index("dust_collectors_code_key", ["code"], { unique: true })
@Index("dust_collectors_pkey", ["id"], { unique: true })
@Entity("dust_collectors", { schema: "public" })
export class DustCollectors {
  @PrimaryGeneratedColumn({ type: "smallint", name: "id" })
  id: number;

  @Column("character varying", { name: "code", unique: true, length: 30 })
  code: string;

  @Column("character varying", { name: "name", length: 100 })
  name: string;

  @Column("double precision", { name: "min_diameter_um", precision: 53 })
  minDiameterUm: number;

  @Column("double precision", { name: "max_diameter_um", precision: 53 })
  maxDiameterUm: number;

  @Column("character varying", { name: "typical_efficiency", length: 50 })
  typicalEfficiency: string;

  @Column("character varying", { name: "note", nullable: true, length: 300 })
  note: string | null;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

  @ManyToMany(
    () => FractionResults,
    (fractionResults) => fractionResults.dustCollectors
  )
  @JoinTable({
    name: "fraction_collector_suggestions",
    joinColumns: [{ name: "collector_id", referencedColumnName: "id" }],
    inverseJoinColumns: [
      { name: "fraction_id", referencedColumnName: "fractionId" },
    ],
    schema: "public",
  })
  fractionResults: FractionResults[];
}
