
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ParticleFractionDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  diameterMicron!: number;

  @Type(() => Number)
  @IsNumber()
  weightPercent!: number;
}

export class CalculateChamberDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  flowRate!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-50)
  @Max(500)
  temperature!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  length!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  width!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  height!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  particleDensity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  particleDiameter?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dustConcentration?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticleFractionDto)
  particleFractions?: ParticleFractionDto[];

  // Thông số đường ống và quạt
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  ductVelocity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gasVelocity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pipeLength?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  frictionRPAM?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  roughnessBeta?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  localResistanceSum?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chamberPressureDropPA?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fanEfficiency?: number;
}
