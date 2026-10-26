
import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateHistoryDto {
  @ApiProperty({
    example: "Buồng lắng bụi số 1",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    enum: ["CHECK", "DESIGN"],
    example: "DESIGN",
  })
  @IsIn(["CHECK", "DESIGN"])
  mode: "CHECK" | "DESIGN";

  @ApiProperty({
    required: false,
    example: "Phương án thử nghiệm",
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
  })
  @IsObject()
  input: Record<string, unknown>;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
  })
  @IsObject()
  result: Record<string, unknown>;
}
