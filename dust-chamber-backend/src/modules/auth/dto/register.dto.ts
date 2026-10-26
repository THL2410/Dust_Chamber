import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { CreateUserDto } from "src/modules/users/dto/create-user.dto";

@ValidatorConstraint({ name: "passwordMatch", async: false })
class PasswordMatchConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: any) {
    return confirmPassword === args.object.password;
  }

  defaultMessage() {
    return "Mật khẩu xác nhận không khớp";
  }
}

export class RegisterDto extends CreateUserDto {
  @ApiProperty({
    example: "Matkhau123",
    description: "Nhập lại mật khẩu",
  })
  @IsString()
  @IsNotEmpty({ message: "Vui lòng xác nhận mật khẩu" })
  @Validate(PasswordMatchConstraint)
  confirmPassword: string;
}
