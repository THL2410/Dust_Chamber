import { Type } from 'class-transformer';
import {
  IsNumber,
  IsPositive,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * All values use SI units:
 * flowRate: m³/s; temperature: °C; dimensions: m;
 * particleDensity: kg/m³; particleDiameter: m.
 */
export class CalculateChamberDto {
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  flowRate!: number;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-50)
  @Max(500)
  temperature!: number;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  length!: number;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  width!: number;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  height!: number;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  particleDensity!: number;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  particleDiameter!: number;

  /**
   * Optional gas density override in kg/m³.
   * Normally leave omitted to use the PDF's approximation.
   */
  @ValidateIf((_obj, value) => value !== undefined)
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  gasDensity?: number;
}
