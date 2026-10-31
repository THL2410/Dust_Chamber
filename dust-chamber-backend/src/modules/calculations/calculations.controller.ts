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
  @ApiBody({ type: CreateCalculationDto })
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