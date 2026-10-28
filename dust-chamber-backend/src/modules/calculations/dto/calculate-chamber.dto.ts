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
  diameterMicron!: number; // Đường kính hạt (µm)

  @Type(() => Number)
  @IsNumber()
  weightPercent!: number; // Tỷ lệ % khối lượng (%)
}

export class CalculateChamberDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  flowRate!: number; // Lưu lượng khí Q (m³/h hoặc m³/s)

  @Type(() => Number)
  @IsNumber()
  @Min(-50)
  @Max(500)
  temperature!: number; // Nhiệt độ °C

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  length!: number; // Chiều dài L (m)

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  width!: number; // Chiều rộng B (m)

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  height!: number; // Chiều cao H (m)

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  particleDensity!: number; // Khối lượng riêng bụi (kg/m³)

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  particleDiameter?: number; // Đường kính hạt đơn lẻ (m) - dùng cho tính toán cơ bản

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dustConcentration?: number; // Nồng độ bụi vào C_b (g/m³)

  // Bảng phân cấp thành phần hạt (Dùng cho Ví dụ 2 & Ví dụ 3)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticleFractionDto)
  particleFractions?: ParticleFractionDto[];

  // Các thông số thiết kế đường ống & quạt (Ví dụ 3)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ductVelocity?: number; // Vận tốc chọn trong ống v (m/s), thường 10-20 m/s

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  localResistanceSum?: number; // Tổng trở lực cục bộ ∑ξ_i

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fanEfficiency?: number; // Hiệu suất quạt η (vd: 0.7 cho 70%)
}