import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsNumber, IsOptional, IsPositive, IsString, Max, Min, ValidateNested,
} from 'class-validator';
import { ParticleFractionDto } from './calculate-chamber.dto';

export class CreateCalculationDto {
  @ApiPropertyOptional({ example: 'Phương án buồng lắng bụi số 1' })
  @IsOptional() @IsString()
  name?: string;

  @ApiProperty({ example: 5000, description: 'Lưu lượng khí Q (m³/h)' })
  @Type(() => Number) @IsNumber() @IsPositive()
  flowRateM3H!: number;

  @ApiProperty({ example: 35, description: 'Nhiệt độ khí t (°C), -50 đến 1000' })
  @Type(() => Number) @IsNumber() @Min(-50) @Max(1000)
  temperatureC!: number;

  @ApiProperty({ example: 12.5, description: 'Nồng độ bụi vào Cb (g/m³)' })
  @Type(() => Number) @IsNumber() @Min(0)
  dustConcentrationGM3!: number;

  @ApiProperty({ example: 2000, description: 'Khối lượng riêng bụi ρb (kg/m³)' })
  @Type(() => Number) @IsNumber() @IsPositive()
  dustDensityKgM3!: number;

  @ApiPropertyOptional({ example: 40, description: 'd_min cần lắng (μm). Cần cho chế độ DESIGN' })
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive()
  dMinTargetUm?: number;

  @ApiPropertyOptional({ example: 2, description: 'Chiều cao buồng H (m)' })
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive()
  chamberHeightM?: number;

  @ApiPropertyOptional({ example: 6, description: 'Chiều dài buồng L (m)' })
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive()
  chamberLengthM?: number;

  @ApiPropertyOptional({ example: 1, description: 'Chiều rộng buồng B (m)' })
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive()
  chamberWidthM?: number;

  @ApiPropertyOptional({ example: 0.18, description: 'Vận tốc khí trong buồng v (m/s)' })
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive()
  gasVelocityMS?: number;

  @ApiPropertyOptional({ example: 16, description: 'Số giờ làm việc/ngày (0-24)' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(24)
  operatingHoursPerDay?: number;

  @ApiPropertyOptional({ example: 15, description: 'Vận tốc khí trong ống (m/s)' })
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive()
  pipeVelocityMS?: number;

  @ApiPropertyOptional({ example: 1, description: 'Đường kính ống d0 (m). Bỏ trống thì tự tính (B26)' })
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive()
  pipeDiameterM?: number;

  @ApiPropertyOptional({ example: 32, description: 'Chiều dài ống ld (m)' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  pipeLengthM?: number;

  @ApiPropertyOptional({ example: 4.05, description: 'Tổn thất ma sát đơn vị R (Pa/m)' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  frictionRPaM?: number;

  @ApiPropertyOptional({ example: 1, description: 'Hệ số nhám β' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  roughnessBeta?: number;

  @ApiPropertyOptional({ example: 0, description: 'Tổng hệ số trở lực cục bộ Σξ' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  localResistanceSum?: number;

  @ApiPropertyOptional({ example: 245, description: 'Tổn thất áp suất buồng lắng (Pa)' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  chamberPressureDropPa?: number;

  @ApiPropertyOptional({ example: 0.6, description: 'Hiệu suất quạt (0 < η ≤ 1)' })
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() @Max(1)
  fanEfficiency?: number;

  @ApiPropertyOptional({
    type: [ParticleFractionDto],
    description: 'Phân bố cỡ hạt, dùng để tính hiệu suất tổng và nồng độ bụi ra',
    example: [{ diameterMicron: 20, weightPercent: 30 }, { diameterMicron: 60, weightPercent: 70 }],
  })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ParticleFractionDto)
  particleFractions?: ParticleFractionDto[];
}