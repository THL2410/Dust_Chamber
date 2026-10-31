import { Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import { DesignProjects } from "./DesignProjects";

@Index("design_inputs_pkey", ["projectId"], { unique: true })
@Entity("design_inputs", { schema: "public" })
export class DesignInputs {
  @Column("integer", { primary: true, name: "project_id" })
  projectId: number;

  @Column("double precision", { name: "flow_rate_m3_h", precision: 53 })
  flowRateM3H: number;

  @Column("double precision", { name: "temperature_c", precision: 53 })
  temperatureC: number;

  @Column("double precision", {
    name: "dust_concentration_g_m3",
    precision: 53,
  })
  dustConcentrationGM3: number;

  @Column("double precision", { name: "dust_density_kg_m3", precision: 53 })
  dustDensityKgM3: number;

  @Column("double precision", {
    name: "d_min_target_um",
    nullable: true,
    precision: 53,
  })
  dMinTargetUm: number | null;

  @Column("double precision", {
    name: "chamber_height_m",
    nullable: true,
    precision: 53,
  })
  chamberHeightM: number | null;

  @Column("double precision", {
    name: "chamber_length_m",
    nullable: true,
    precision: 53,
  })
  chamberLengthM: number | null;

  @Column("double precision", {
    name: "chamber_width_m",
    nullable: true,
    precision: 53,
  })
  chamberWidthM: number | null;

  @Column("double precision", {
    name: "gas_velocity_m_s",
    precision: 53,
    default: () => "0.18",
  })
  gasVelocityMS: number;

  @Column("double precision", {
    name: "operating_hours_per_day",
    precision: 53,
    default: () => "16",
  })
  operatingHoursPerDay: number;

  @Column("double precision", {
    name: "pipe_velocity_m_s",
    precision: 53,
    default: () => "15",
  })
  pipeVelocityMS: number;

  @Column("double precision", {
    name: "pipe_diameter_m",
    nullable: true,
    precision: 53,
  })
  pipeDiameterM: number | null;

  @Column("double precision", {
    name: "pipe_length_m",
    precision: 53,
    default: () => "32",
  })
  pipeLengthM: number;

  @Column("double precision", {
    name: "friction_r_pa_m",
    precision: 53,
    default: () => "4.05",
  })
  frictionRPaM: number;

  @Column("double precision", {
    name: "roughness_beta",
    precision: 53,
    default: () => "1",
  })
  roughnessBeta: number;

  @Column("double precision", {
    name: "local_resistance_sum",
    precision: 53,
    default: () => "0",
  })
  localResistanceSum: number;

  @Column("double precision", {
    name: "chamber_pressure_drop_pa",
    precision: 53,
    default: () => "245",
  })
  chamberPressureDropPa: number;

  @Column("double precision", {
    name: "fan_efficiency",
    precision: 53,
    default: () => "0.6",
  })
  fanEfficiency: number;

  @OneToOne(
    () => DesignProjects,
    (designProjects) => designProjects.designInputs,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "project_id", referencedColumnName: "id" }])
  project: DesignProjects;
}
