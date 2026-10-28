
import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CalculateChamberDto } from './dto/calculate-chamber.dto';
import { CalculationsService } from './calculations.service';

@ApiTags('Calculations')
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
  calculateChamber(@Body() dto: CalculateChamberDto) {
    return this.calculationsService.calculateChamber(dto);
  }
}
