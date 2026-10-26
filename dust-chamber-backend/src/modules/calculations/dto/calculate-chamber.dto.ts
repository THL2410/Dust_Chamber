import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsNumber, IsOptional, IsPositive,
  Max, Min, ValidateIf, ValidateNested,
} from 'class-validator';

export class ChamberSizeDto {
  @IsNumber() @IsPositive() length!: number; // L (m)
  @IsNumber() @IsPositive() width!: number;  // B (m)
  @IsNumber() @IsPositive() height!: number; // H (m)
}

export class ParticleFractionDto {
  @IsNumber() @Min(0) dMin!: number;          // µm
  @IsNumber() @IsPositive() dMax!: number;    // µm (đường kính dùng để tính)
  @IsNumber() @Min(0) @Max(100) percent!: number; // % khối lượng
}

export class DuctDto {
  @IsOptional() @IsNumber() @IsPositive() velocity?: number;       // v (m/s), mặc định 15
  @IsOptional() @IsNumber() @IsPositive() length?: number;         // ld (m), mặc định 32
  @IsOptional() @IsNumber() @IsPositive() frictionR?: number;      // R (Pa/m), mặc định 4.05
  @IsOptional() @IsNumber() @IsPositive() roughnessBeta?: number;  // β, mặc định 1
  @IsOptional() @IsNumber() @Min(0) sumLocalResistance?: number;   // Σξ, mặc định 0
  @IsOptional() @IsNumber() @IsPositive() chamberPressureDrop?: number; // ΔPbl (Pa), mặc định 245
  @IsOptional() @IsNumber() @IsPositive() @Max(1) fanEfficiency?: number; // η quạt, mặc định 0.7
}

export class CalculateChamberDto {
  @IsNumber() @IsPositive() flowRate!: number;                 // Q (m3/h)
  @IsNumber() @Min(-50) @Max(1000) temperature!: number;       // t (°C)
  @IsNumber() @Min(0) dustConcentration!: number;              // Cb (g/m3)
  @IsNumber() @IsPositive() dustDensity!: number;              // ρb (kg/m3)

  // --- Chế độ KIỂM TRA: có kích thước sẵn ---
  @IsOptional()
  @ValidateNested()
  @Type(() => ChamberSizeDto)
  chamberSize?: ChamberSizeDto;

  // --- Chế độ THIẾT KẾ: chưa có kích thước ---
  @ValidateIf((o) => !o.chamberSize)
  @IsNumber() @IsPositive()
  targetDiameter?: number;  // dmin muốn giữ lại (µm)

  @ValidateIf((o) => !o.chamberSize)
  @IsNumber() @IsPositive()
  designLength?: number;    // L chọn trước (m)

  @IsOptional() @IsNumber() @IsPositive() @Max(2.5)
  chamberVelocity?: number; // vận tốc khí trong buồng (m/s), mặc định 0.18

  // --- Phân cấp cỡ hạt (không bắt buộc) ---
  @IsOptional()
  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ParticleFractionDto)
  fractions?: ParticleFractionDto[];

  // --- Ống dẫn + quạt (không bắt buộc) ---
  @IsOptional()
  @ValidateNested()
  @Type(() => DuctDto)
  duct?: DuctDto;
}