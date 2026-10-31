import {
  Controller,
  Post,
  Get,
  Delete,
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

import {
  CurrentUser,
  JwtUser,
} from '../../commons/decorators/current-user.decorator';

import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';

@ApiTags('Calculations')
@ApiBearerAuth('access-token') // phải khớp tên trong main.ts
@UseGuards(JwtAuthGuard)
@Controller('calculations')
export class CalculationsController {
  constructor(
    private readonly calcService: CalculationsService,
  ) {}

  @Post('design')
  @ApiOperation({
    summary: 'Tính toán và lưu phương án thiết kế buồng lắng bụi',
  })
  @ApiBody({
    type: CreateCalculationDto,
    examples: {
      vd2Check: {
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
            { diameterMicron: 5, weightPercent: 10 },
            { diameterMicron: 10, weightPercent: 6.5 },
            { diameterMicron: 20, weightPercent: 9.5 },
            { diameterMicron: 30, weightPercent: 5 },
            { diameterMicron: 40, weightPercent: 7 },
            { diameterMicron: 50, weightPercent: 24 },
            { diameterMicron: 60, weightPercent: 21 },
            { diameterMicron: 70, weightPercent: 10 },
            { diameterMicron: 80, weightPercent: 7 },
          ],
        },
      },
    },
  })
  async runDesign(
    @Body() dto: CreateCalculationDto,
    @CurrentUser() user: JwtUser,
  ) {
    const userId = Number(user.id);

    return this.calcService.calculateAndSave(userId, dto);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Lấy danh sách lịch sử tính toán của người dùng',
  })
  async getHistory(@CurrentUser() user: JwtUser) {
    const userId = Number(user.id);

    return this.calcService.findAllByUser(userId);
  }

  @Get('history/:id')
  @ApiOperation({
    summary: 'Xem chi tiết một phương án tính toán theo ID',
  })
  async getDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.calcService.findOne(id, Number(user.id));
  }

  @Delete('history/:id')
  @ApiOperation({
    summary: 'Xóa lịch sử tính toán theo ID',
  })
  async deleteHistory(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.calcService.remove(id, Number(user.id));
  }
}