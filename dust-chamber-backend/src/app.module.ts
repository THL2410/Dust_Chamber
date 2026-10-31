import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersModule } from "./modules/users/users.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { dbOptions, load } from "./config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HistoryModule } from './modules/history/history.module';
import { CalculationsModule } from './modules/calculations/calculations.module'; // Thêm module tính toán của bạn

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [load],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: dbOptions,
      inject: [ConfigService],
    }),

    UsersModule,
    AuthModule,
    HistoryModule,
    CalculationsModule, // Đăng ký module tính toán vào đây
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}