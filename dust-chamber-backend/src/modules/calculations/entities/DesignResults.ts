import { Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import { DesignProjects } from "./DesignProjects";

@Index("design_results_pkey", ["projectId"], { unique: true })
@Entity("design_results", { schema: "public" })
export class DesignResults {
  @Column("integer", { primary: true, name: "project_id" })
  projectId: number;

  @Column("double precision", { name: "h_m", precision: 53 })
  hM: number;

  @Column("double precision", { name: "l_m", precision: 53 })
  lM: number;

  @Column("double precision", { name: "b_m", precision: 53 })
  bM: number;

  @Column("double precision", { name: "mu_pa_s", precision: 53 })
  muPaS: number;

  @Column("double precision", { name: "rho_gas_kg_m3", precision: 53 })
  rhoGasKgM3: number;

  /** B3: vận tốc khí ngang u = Q/(B·H) (m/s) */
  @Column("double precision", { name: "u_m_s", precision: 53 })
  uMS: number;

  /** Vận tốc lắng cuối cùng của hạt d_limit (m/s), B13 */
  @Column("double precision", { name: "settling_velocity_limit_m_s", precision: 53 })
  vtsLimitMS: number;

  @Column("double precision", { name: "tau1_s", precision: 53 })
  tau1S: number;

  @Column("double precision", { name: "tau2_s", precision: 53 })
  tau2S: number;

  @Column("double precision", { name: "l_min_m", precision: 53 })
  lMinM: number;

  @Column("double precision", { name: "bl_m2", precision: 53 })
  blM2: number;

  @Column("double precision", { name: "d_min_calc_um", precision: 53 })
  dMinCalcUm: number;

  @Column("double precision", { name: "d_limit_um", precision: 53 })
  dLimitUm: number;

  @Column("boolean", { name: "is_retained" })
  isRetained: boolean;

  @Column("double precision", { name: "gv_kg_h", nullable: true, precision: 53 })
  gvKgH: number | null;

  @Column("double precision", { name: "yv_percent", nullable: true, precision: 53 })
  yvPercent: number | null;

  @Column("double precision", { name: "gs_kg_h", nullable: true, precision: 53 })
  gsKgH: number | null;

  @Column("double precision", { name: "qs_m3_h", nullable: true, precision: 53 })
  qsM3H: number | null;

  @Column("double precision", { name: "gb_kg_h", nullable: true, precision: 53 })
  gbKgH: number | null;

  @Column("double precision", { name: "m1_kg_h", nullable: true, precision: 53 })
  m1KgH: number | null;

  @Column("double precision", { name: "m2_kg_h", nullable: true, precision: 53 })
  m2KgH: number | null;

  @Column("double precision", { name: "mt_kg_h", nullable: true, precision: 53 })
  mtKgH: number | null;

  @Column("double precision", { name: "mn_kg_day", nullable: true, precision: 53 })
  mnKgDay: number | null;

  @Column("double precision", { name: "mr_kg_h", nullable: true, precision: 53 })
  mrKgH: number | null;

  @Column("double precision", { name: "cb_out_mg_m3", nullable: true, precision: 53 })
  cbOutMgM3: number | null;

  @Column("double precision", { name: "eta_total_percent", nullable: true, precision: 53 })
  etaTotalPercent: number | null;

  @Column("double precision", { name: "d0_m", nullable: true, precision: 53 })
  d0M: number | null;

  @Column("double precision", { name: "vt_m_s", nullable: true, precision: 53 })
  vtMS: number | null;

  @Column("double precision", { name: "alpha", precision: 53 })
  alpha: number;

  @Column("double precision", { name: "dp_friction_pa", nullable: true, precision: 53 })
  dpFrictionPa: number | null;

  @Column("double precision", { name: "p_dynamic_pa", nullable: true, precision: 53 })
  pDynamicPa: number | null;

  @Column("double precision", { name: "p_local_pa", nullable: true, precision: 53 })
  pLocalPa: number | null;

  @Column("double precision", { name: "dp_pipe_pa", nullable: true, precision: 53 })
  dpPipePa: number | null;

  @Column("double precision", { name: "dp_system_pa", nullable: true, precision: 53 })
  dpSystemPa: number | null;

  @Column("double precision", { name: "fan_power_kw", nullable: true, precision: 53 })
  fanPowerKw: number | null;

  @OneToOne(
    () => DesignProjects,
    (designProjects) => designProjects.designResults,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "project_id", referencedColumnName: "id" }])
  project: DesignProjects;
}
