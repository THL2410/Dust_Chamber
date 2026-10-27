import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional,
  IsString, Min, ValidateNested, IsBoolean
} from 'class-validator';

export class DesignInputDto {
  @IsNumber() @Min(0) flow_rate_m3_h: number;
  @IsNumber() temperature_c: number;
  @IsNumber() @Min(0) dust_concentration_g_m3: number;
  @IsNumber() @Min(0) dust_density_kg_m3: number;

  @IsOptional() @IsNumber() @Min(0) d_min_target_um?: number;
  @IsOptional() @IsNumber() @Min(0) chamber_height_m?: number;
  @IsOptional() @IsNumber() @Min(0) chamber_length_m?: number;
  @IsOptional() @IsNumber() @Min(0) chamber_width_m?: number;

}

export class DesignResultDto {
  @IsNumber() h_m: number;
  @IsNumber() l_m: number;
  @IsNumber() b_m: number;
  @IsNumber() eta_total_percent: number;
  @IsBoolean() is_retained: boolean;
  @IsNumber() fan_power_kw: number;
}

export class FractionResultDto {
  @IsNumber() d_rep_um: number;
  @IsNumber() settling_velocity_m_s: number;
  @IsNumber() @Min(0) efficiency_percent: number;
  @IsNumber() @Min(0) inlet_conc_g_m3: number;
  @IsNumber() @Min(0) outlet_conc_g_m3: number;
  @IsEnum(['FULL', 'PARTIAL', 'OTHER_DEVICE']) regime: 'FULL' | 'PARTIAL' | 'OTHER_DEVICE';
}

export class DustFractionDto {
  @IsNumber() @Min(0) d_from_um: number;
  @IsOptional() @IsNumber() @Min(0) d_to_um?: number;
  @IsNumber() @Min(0) mass_percent: number;

  @ValidateNested()
  @Type(() => FractionResultDto)
  result: FractionResultDto;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  collector_ids?: number[];
}

export class CreateHistoryDto {
  @ApiProperty({ example: 'Phương án Xưởng Gỗ' })
  @IsString()
  @IsNotEmpty({ message: 'Tên phương án không được để trống' })
  name: string;

  @ApiProperty({ enum: ['CHECK', 'DESIGN'] })
  @IsEnum(['CHECK', 'DESIGN'])
  mode: 'CHECK' | 'DESIGN';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => DesignInputDto)
  input: DesignInputDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => DesignResultDto)
  result: DesignResultDto;

  @ApiProperty({ type: [DustFractionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DustFractionDto)
  fractions?: DustFractionDto[];
}