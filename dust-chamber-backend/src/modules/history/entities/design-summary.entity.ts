import { ViewColumn, ViewEntity } from "typeorm";

@ViewEntity({ name: "v_design_summary", synchronize: false })
export class DesignSummary {
  @ViewColumn() id: number;
  @ViewColumn({ name: "user_id" }) userId: number;
  @ViewColumn() name: string;
  @ViewColumn() mode: string;
  @ViewColumn({ name: "created_at" }) createdAt: Date;
  @ViewColumn({ name: "flow_rate_m3_h" }) flowRateM3H: number;
  @ViewColumn({ name: "temperature_c" }) temperatureC: number;
  @ViewColumn({ name: "dust_concentration_g_m3" }) dustConcentrationGM3: number;
  @ViewColumn({ name: "h_m" }) hM: number;
  @ViewColumn({ name: "l_m" }) lM: number;
  @ViewColumn({ name: "b_m" }) bM: number;
  @ViewColumn({ name: "d_min_calc_um" }) dMinCalcUm: number;
  @ViewColumn({ name: "is_retained" }) isRetained: boolean;
  @ViewColumn({ name: "eta_total_percent" }) etaTotalPercent: number;
  @ViewColumn({ name: "cb_out_mg_m3" }) cbOutMgM3: number;
  @ViewColumn({ name: "fan_power_kw" }) fanPowerKw: number;
}
