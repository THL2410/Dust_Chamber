
import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
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
}
