import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: 10, description: 'Đường kính hạt (micron)' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  diameterMicron!: number;

  @ApiProperty({ example: 30, description: 'Phần trăm trọng lượng (%)' })
  @Type(() => Number)
  @IsNumber()
  weightPercent!: number;
}

export class CalculateChamberDto {
  @ApiProperty({ example: 5000, description: 'Lưu lượng khí thải (m³/h)' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  flowRate!: number;

  @ApiProperty({ example: 30, description: 'Nhiệt độ dòng khí (°C)' })
  @Type(() => Number)
  @IsNumber()
  @Min(-50)
  @Max(500)
  temperature!: number;

  @ApiProperty({ example: 2.5, description: 'Chiều dài buồng lắng (m)' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  length!: number;

  @ApiProperty({ example: 1.5, description: 'Chiều rộng buồng lắng (m)' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  width!: number;

  @ApiProperty({ example: 1.0, description: 'Chiều cao buồng lắng (m)' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  height!: number;

  @ApiProperty({ example: 2500, description: 'Mật độ hạt bụi (kg/m³)' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  particleDensity!: number;

  @ApiPropertyOptional({ example: 10, description: 'Đường kính hạt đơn lẻ tùy chọn (m)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  particleDiameter?: number;

  @ApiPropertyOptional({ example: 15.5, description: 'Nồng độ bụi đầu vào (g/m³)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dustConcentration?: number;

  @ApiPropertyOptional({
    description: 'Phân bố kích thước hạt bụi theo dải phần trăm',
    type: [ParticleFractionDto],
    example: [
      { diameterMicron: 10, weightPercent: 40 },
      { diameterMicron: 20, weightPercent: 60 },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticleFractionDto)
  particleFractions?: ParticleFractionDto[];

  // Thông số đường ống và quạt
  @ApiPropertyOptional({ example: 15, description: 'Vận tốc dòng khí trong ống dẫn (m/s)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  ductVelocity?: number;

  @ApiPropertyOptional({ example: 0.18, description: 'Vận tốc khí trong buồng (m/s)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gasVelocity?: number;

  @ApiPropertyOptional({ example: 32, description: 'Chiều dài đường ống dẫn (m)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pipeLength?: number;

  @ApiPropertyOptional({ example: 4.05, description: 'Tổn thất ma sát đơn vị trên ống (Pa/m)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  frictionRPAM?: number;

  @ApiPropertyOptional({ example: 1.0, description: 'Hệ số nhám thành ống beta' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  roughnessBeta?: number;

  @ApiPropertyOptional({ example: 2.5, description: 'Tổng hệ số trở lực cục bộ' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  localResistanceSum?: number;

  @ApiPropertyOptional({ example: 245, description: 'Tổn thất áp suất trong buồng lắng (Pa)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chamberPressureDropPA?: number;

  @ApiPropertyOptional({ example: 0.7, description: 'Hiệu suất quạt hút (tỉ lệ 0 - 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fanEfficiency?: number;
}