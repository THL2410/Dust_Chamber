import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CalculationsService } from './calculations.service';
import { CreateCalculationDto } from './dto/create-calculation.dto';
import { UpdateCalculationDto } from './dto/update-calculation.dto';

import {
  CurrentUser,
  JwtUser,
} from '../../commons/decorators/current-user.decorator';

import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';

// Body mẫu: Ví dụ 2 trong PDF (chế độ CHECK)
const VD2_EXAMPLE = {
  summary: 'Ví dụ 2 trong PDF (chế độ CHECK)',
  description:
    'Cho sẵn H, L, B: tính d_min, hiệu suất và nồng độ bụi ra. Kết quả kỳ vọng: dLimitUm = 50, etaTotalPercent ≈ 72,05.',
  value: {
    name: 'Ví dụ 2 - buồng lắng bụi (CHECK)',
    flowRateM3H: 20000,
    temperatureC: 40,
    dustConcentrationGM3: 15,
    dustDensityKgM3: 3000,
    chamberHeightM: 2,
    chamberLengthM: 8,
    chamberWidthM: 4,
    localResistanceSum: 2.5,
    particleFractions: [
      { diameterFromMicron: 0, diameterMicron: 5, weightPercent: 10 },
      { diameterFromMicron: 5, diameterMicron: 10, weightPercent: 6.5 },
      { diameterFromMicron: 10, diameterMicron: 20, weightPercent: 9.5 },
      { diameterFromMicron: 20, diameterMicron: 30, weightPercent: 5 },
      { diameterFromMicron: 30, diameterMicron: 40, weightPercent: 7 },
      { diameterFromMicron: 40, diameterMicron: 50, weightPercent: 24 },
      { diameterFromMicron: 50, diameterMicron: 60, weightPercent: 21 },
      { diameterFromMicron: 60, diameterMicron: 70, weightPercent: 10 },
      { diameterFromMicron: 70, diameterMicron: 80, weightPercent: 7 },
    ],
  },
};

@ApiTags('Calculations')
@ApiBearerAuth() // khớp addBearerAuth() không tên trong main.ts
@UseGuards(JwtAuthGuard)
@Controller('calculations')
export class CalculationsController {
  constructor(private readonly calcService: CalculationsService) {}

  // API 1: tính và xem trước, KHÔNG lưu, KHÔNG tạo ID
  @Post('preview')
  @ApiOperation({
    summary: 'Tính toán và xem trước kết quả (không lưu vào database)',
  })
  @ApiBody({ type: CreateCalculationDto, examples: { vd2Check: VD2_EXAMPLE } })
  preview(@Body() dto: CreateCalculationDto) {
    return this.calcService.preview(dto);
  }

  // API 2: tính bằng cùng bộ công thức rồi lưu, tạo ID mới
  @Post()
  @ApiOperation({
    summary: 'Tính toán và lưu phép tính mới (gọi sau khi đã xem preview)',
  })
  @ApiBody({ type: CreateCalculationDto, examples: { vd2Check: VD2_EXAMPLE } })
  create(@Body() dto: CreateCalculationDto, @CurrentUser() user: JwtUser) {
    return this.calcService.create(Number(user.id), dto);
  }

  // API 3: sửa đầu vào và tự tính lại, giữ nguyên ID
  @Patch(':id')
  @ApiOperation({
    summary: 'Sửa phép tính đã lưu và tự động tính lại (giữ nguyên ID)',
    description:
      'Chỉ cần gửi các trường muốn đổi. Trường không gửi giữ nguyên, trường gửi null sẽ bị xóa. ' +
      'Nếu gửi particleFractions thì thay toàn bộ phân bố cỡ hạt.',
  })
  @ApiBody({
    type: UpdateCalculationDto,
    examples: {
      doiLuuLuong: {
        summary: 'Đổi lưu lượng và nhiệt độ (giữ nguyên phần còn lại)',
        value: { flowRateM3H: 22000, temperatureC: 45 },
      },
      doiPhanBo: {
        summary: 'Thay phân bố cỡ hạt',
        value: {
          particleFractions: [
            { diameterFromMicron: 0, diameterMicron: 30, weightPercent: 40 },
            { diameterFromMicron: 30, diameterMicron: 60, weightPercent: 60 },
          ],
        },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCalculationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.calcService.update(id, Number(user.id), dto);
  }
}