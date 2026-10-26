import { Column, Entity, PrimaryColumn } from "typeorm";

// Entity ánh xạ bảng kết quả thật; không dùng synchronize để sửa schema.
@Entity("design_results")
export class DesignResult {
  @PrimaryColumn({ type: "integer" }) project_id: number;
  @Column("double precision") h_m: number;
  @Column("double precision") l_m: number;
  @Column("double precision") b_m: number;
  @Column("double precision") mu_pa_s: number;
  @Column("double precision") rho_gas_kg_m3: number;
  @Column("double precision") u_m_s: number;
  @Column("double precision") tau1_s: number;
  @Column("double precision") tau2_s: number;
  @Column("double precision") l_min_m: number;
  @Column("double precision") bl_m2: number;
  @Column("double precision") d_min_calc_um: number;
  @Column("double precision") d_limit_um: number;
  @Column("boolean") is_retained: boolean;
  @Column("double precision") gv_kg_h: number;
  @Column("double precision") yv_percent: number;
  @Column("double precision") gs_kg_h: number;
  @Column("double precision") qs_m3_h: number;
  @Column("double precision") gb_kg_h: number;
  @Column("double precision") m1_kg_h: number;
  @Column("double precision") m2_kg_h: number;
  @Column("double precision") mt_kg_h: number;
  @Column("double precision") mn_kg_day: number;
  @Column("double precision") mr_kg_h: number;
  @Column("double precision") cb_out_mg_m3: number;
  @Column("double precision") eta_total_percent: number;
  @Column("double precision") d0_m: number;
  @Column("double precision") vt_m_s: number;
  @Column("double precision") alpha: number;
  @Column("double precision") dp_friction_pa: number;
  @Column("double precision") p_dynamic_pa: number;
  @Column("double precision") p_local_pa: number;
  @Column("double precision") dp_pipe_pa: number;
  @Column("double precision") dp_system_pa: number;
  @Column("double precision") fan_power_kw: number;
}

// Bảng kết quả tính toán cho từng dải hạt bụi.
@Entity("fraction_results")
export class FractionResult {
  @PrimaryColumn({ type: "integer" }) fraction_id: number;
  @Column("double precision") d_rep_um: number;
  @Column("double precision") settling_velocity_m_s: number;
  @Column("double precision") efficiency_percent: number;
  @Column("double precision") inlet_conc_g_m3: number;
  @Column("double precision") outlet_conc_g_m3: number;
  @Column({ type: "enum", enumName: "capture_regime", enum: ["FULL", "PARTIAL", "OTHER_DEVICE"] })
  regime: "FULL" | "PARTIAL" | "OTHER_DEVICE";
}
