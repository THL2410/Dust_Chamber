import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray, IsIn, IsNotEmpty, IsObject, IsOptional,
  IsString, MaxLength,
} from "class-validator";

export class CreateHistoryDto {
  @ApiProperty({ example: "Buồng lắng bụi số 1" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: ["CHECK", "DESIGN"] })
  @IsIn(["CHECK", "DESIGN"])
  mode: "CHECK" | "DESIGN";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: "object", additionalProperties: true })
  @IsObject()
  input: Record<string, unknown>;

  @ApiProperty({ type: "object", additionalProperties: true })
  @IsObject()
  result: Record<string, unknown>;

  @ApiPropertyOptional({
    type: [Object],
    description: "Mỗi dải bụi gồm d_from_um, d_to_um, mass_percent, result và collector_ids tùy chọn",
  })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  fractions?: Record<string, unknown>[];
}
