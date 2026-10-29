import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Import đầy đủ các entity từ thư mục src/entities/
import { AlphaCoefficients } from './entities/AlphaCoefficients';
import { DesignInputs } from './entities/DesignInputs';
import { DesignProjects } from './entities/DesignProjects';
import { DesignResults } from './entities/DesignResults';
import { DustCollectors } from './entities/DustCollectors';
import { DustFractions } from './entities/DustFractions';
import { FractionResults } from './entities/FractionResults';
import { RefreshTokens } from './entities/RefreshTokens';
import { Users } from './entities/Users';

import { CalculationsModule } from './modules/calculations/calculations.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // Cấu hình biến môi trường .env
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Cấu hình kết nối PostgreSQL qua TypeORM với đầy đủ các entities
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASS', ''),
        database: configService.get<string>('DB_NAME', 'dust_chamber'),
        
        // Khai báo mảng entities đầy đủ để tránh lỗi thiếu metadata quan hệ (như DesignProjects#user)
        entities: [
          AlphaCoefficients,
          DesignInputs,
          DesignProjects,
          DesignResults,
          DustCollectors,
          DustFractions,
          FractionResults,
          RefreshTokens,
          Users,
        ],
        
        synchronize: false, // Đặt thành true nếu muốn TypeORM tự động tạo bảng (khuyến cáo cẩn thận khi chạy thật)
      }),
    }),

    // Các module nghiệp vụ trong dự án
    CalculationsModule,
    AuthModule,
  ],
})
export class AppModule {}