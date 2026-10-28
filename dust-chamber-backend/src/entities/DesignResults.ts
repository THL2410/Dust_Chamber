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

  @Column("double precision", { name: "u_m_s", precision: 53 })
  uMS: number;

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

  @Column("double precision", { name: "gv_kg_h", precision: 53 })
  gvKgH: number;

  @Column("double precision", { name: "yv_percent", precision: 53 })
  yvPercent: number;

  @Column("double precision", { name: "gs_kg_h", precision: 53 })
  gsKgH: number;

  @Column("double precision", { name: "qs_m3_h", precision: 53 })
  qsM3H: number;

  @Column("double precision", { name: "gb_kg_h", precision: 53 })
  gbKgH: number;

  @Column("double precision", { name: "m1_kg_h", precision: 53 })
  m1KgH: number;

  @Column("double precision", { name: "m2_kg_h", precision: 53 })
  m2KgH: number;

  @Column("double precision", { name: "mt_kg_h", precision: 53 })
  mtKgH: number;

  @Column("double precision", { name: "mn_kg_day", precision: 53 })
  mnKgDay: number;

  @Column("double precision", { name: "mr_kg_h", precision: 53 })
  mrKgH: number;

  @Column("double precision", { name: "cb_out_mg_m3", precision: 53 })
  cbOutMgM3: number;

  @Column("double precision", { name: "eta_total_percent", precision: 53 })
  etaTotalPercent: number;

  @Column("double precision", { name: "d0_m", precision: 53 })
  d0M: number;

  @Column("double precision", { name: "vt_m_s", precision: 53 })
  vtMS: number;

  @Column("double precision", { name: "alpha", precision: 53 })
  alpha: number;

  @Column("double precision", { name: "dp_friction_pa", precision: 53 })
  dpFrictionPa: number;

  @Column("double precision", { name: "p_dynamic_pa", precision: 53 })
  pDynamicPa: number;

  @Column("double precision", { name: "p_local_pa", precision: 53 })
  pLocalPa: number;

  @Column("double precision", { name: "dp_pipe_pa", precision: 53 })
  dpPipePa: number;

  @Column("double precision", { name: "dp_system_pa", precision: 53 })
  dpSystemPa: number;

  @Column("double precision", { name: "fan_power_kw", precision: 53 })
  fanPowerKw: number;

  @OneToOne(
    () => DesignProjects,
    (designProjects) => designProjects.designResults,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "project_id", referencedColumnName: "id" }])
  project: DesignProjects;
}
