import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalculationsController } from './calculations.controller';
import { CalculationsService } from './calculations.service';
import { DesignProjects } from './entities/DesignProjects';
import { DesignInputs } from './entities/DesignInputs';
import { DesignResults } from './entities/DesignResults';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DesignProjects, DesignInputs, DesignResults]),
    AuthModule,
  ],
  controllers: [CalculationsController],
  providers: [CalculationsService],
})
export class CalculationsModule {}