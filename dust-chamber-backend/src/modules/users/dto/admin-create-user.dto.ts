import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { CreateUserDto } from "./create-user.dto";

export class AdminCreateUserDto extends CreateUserDto {
  @ApiProperty({
    enum: ["user", "admin"],
    example: "user",
  })
  @IsIn(["user", "admin"])
  role: "user" | "admin";
}
