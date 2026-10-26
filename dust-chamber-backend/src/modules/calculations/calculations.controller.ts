import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CalculationsService } from './calculations.service';
import { CalculateChamberDto } from './dto/calculate-chamber.dto';

@Controller('calculations')
export class CalculationsController {
  constructor(private readonly calculationsService: CalculationsService) {}

  @Post()
  @HttpCode(200)
  calculate(@Body() dto: CalculateChamberDto) {
    return this.calculationsService.calculate(dto);
  }
}