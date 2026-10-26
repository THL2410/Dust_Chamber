import { Module } from '@nestjs/common';
import { CalculationsController } from './calculations.controller';
import { CalculationsService } from './calculations.service';

@Module({
  controllers: [CalculationsController],
  providers: [CalculationsService],
  exports: [CalculationsService], // để sau này lưu lịch sử tính toán vào DB
})
export class CalculationsModule {}