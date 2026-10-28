import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  OneToOne,
} from "typeorm";
import { DustCollectors } from "./DustCollectors";
import { DustFractions } from "./DustFractions";

@Index("fraction_results_pkey", ["fractionId"], { unique: true })
@Index("idx_fraction_results_regime", ["regime"], {})
@Entity("fraction_results", { schema: "public" })
export class FractionResults {
  @Column("integer", { primary: true, name: "fraction_id" })
  fractionId: number;

  @Column("double precision", { name: "d_rep_um", precision: 53 })
  dRepUm: number;

  @Column("double precision", { name: "settling_velocity_m_s", precision: 53 })
  settlingVelocityMS: number;

  @Column("double precision", { name: "efficiency_percent", precision: 53 })
  efficiencyPercent: number;

  @Column("double precision", { name: "inlet_conc_g_m3", precision: 53 })
  inletConcGM3: number;

  @Column("double precision", { name: "outlet_conc_g_m3", precision: 53 })
  outletConcGM3: number;

  @Column("enum", { name: "regime", enum: ["FULL", "PARTIAL", "OTHER_DEVICE"] })
  regime: "FULL" | "PARTIAL" | "OTHER_DEVICE";

  @ManyToMany(
    () => DustCollectors,
    (dustCollectors) => dustCollectors.fractionResults
  )
  dustCollectors: DustCollectors[];

  @OneToOne(
    () => DustFractions,
    (dustFractions) => dustFractions.fractionResults,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "fraction_id", referencedColumnName: "id" }])
  fraction: DustFractions;
}
