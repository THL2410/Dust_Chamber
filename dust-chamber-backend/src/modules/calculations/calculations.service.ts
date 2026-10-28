
import {
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

import { CalculateChamberDto } from './dto/calculate-chamber.dto';
import { CalculationEngine } from './calculation.engine';

@Injectable()
export class CalculationsService {
  calculateChamber(dto: CalculateChamberDto) {
    try {
      return {
        success: true,
        data: CalculationEngine.calculate(dto),
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to calculate chamber parameters.';

      throw new UnprocessableEntityException({
        success: false,
        message,
      });
    }
  }
}
