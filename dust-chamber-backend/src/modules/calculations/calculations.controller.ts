import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CalculateChamberDto } from './dto/calculate-chamber.dto';
import { CalculationsService } from './calculations.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: number;
    userId?: number;
  };
}

@ApiTags('Calculations')
@ApiBearerAuth()
@Controller('calculations')
export class CalculationsController {
  constructor(
    private readonly calculationsService: CalculationsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Calculate settling-chamber parameters',
    description: 'All request dimensions use SI units.',
  })
  @ApiResponse({ status: 201, description: 'Tính toán và lưu thành công.' })
  async calculateChamber(
    @Body() dto: CalculateChamberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id ?? req.user?.userId;

    if (userId == null) {
      throw new UnauthorizedException(
        'Cannot identify the authenticated user.',
      );
    }

    return this.calculationsService.calculateChamber(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả các phương án tính toán' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công.' })
  async findAll() {
    return await this.calculationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một phương án tính toán theo ID' })
  @ApiParam({ name: 'id', description: 'ID của phương án', example: 1 })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ID.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.calculationsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một phương án tính toán theo ID' })
  @ApiParam({ name: 'id', description: 'ID của phương án cần xóa', example: 1 })
  @ApiResponse({ status: 200, description: 'Xóa thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ID để xóa.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.calculationsService.remove(id);
  }
}