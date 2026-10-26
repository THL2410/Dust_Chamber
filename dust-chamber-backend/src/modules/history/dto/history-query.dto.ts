import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString, IsIn, IsInt, IsOptional, IsString,
  Matches, Max, MaxLength, Min,
} from "class-validator";

export class HistoryQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt() @Min(1) @Max(1000000)
  page = 1;

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsInt() @Min(1) @Max(100)
  limit = 10;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: ["CHECK", "DESIGN"] })
  @IsOptional() @IsIn(["CHECK", "DESIGN"])
  mode?: "CHECK" | "DESIGN";

  @ApiPropertyOptional({ example: "2026-10-01" })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: "2026-10-31" })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ enum: ["createdAt", "name", "etaTotalPercent"] })
  @IsIn(["createdAt", "name", "etaTotalPercent"])
  sortBy: "createdAt" | "name" | "etaTotalPercent" = "createdAt";

  @ApiPropertyOptional({ enum: ["ASC", "DESC"] })
  @IsIn(["ASC", "DESC"])
  order: "ASC" | "DESC" = "DESC";
}
