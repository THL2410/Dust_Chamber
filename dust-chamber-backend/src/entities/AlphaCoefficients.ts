import { Column, Entity, Index } from "typeorm";

@Index("alpha_coefficients_pkey", ["temperatureC"], { unique: true })
@Entity("alpha_coefficients", { schema: "public" })
export class AlphaCoefficients {
  @Column("smallint", { primary: true, name: "temperature_c" })
  temperatureC: number;

  @Column("double precision", { name: "alpha", precision: 53 })
  alpha: number;
}
