import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalculationsController } from './calculations.controller';
import { CalculationsService } from './calculations.service';

// Import các entities tương ứng của bạn
import { DesignProjects } from '../../entities/DesignProjects';
import { DesignInputs } from '../../entities/DesignInputs';
import { DesignResults } from '../../entities/DesignResults';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DesignProjects,
      DesignInputs,
      DesignResults,
    ]),
  ],
  controllers: [CalculationsController],
  providers: [CalculationsService],
  exports: [CalculationsService],
})
export class CalculationsModule {}