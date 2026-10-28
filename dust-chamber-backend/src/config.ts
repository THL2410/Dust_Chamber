
import { ConfigService } from "@nestjs/config";
import { JwtModuleOptions } from "@nestjs/jwt";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { join } from "path";

export const load = () => {
  const env = process.env;

  const dbConfig = {
    host: env.DB_HOST || "127.0.0.1",
    port: parseInt(env.DB_PORT || "5432", 10),
    username: env.DB_USER || "postgres",
    password: String(env.DB_PASS || "Siuma299@#*()"),
    database: env.DB_NAME || "dust_chamber",
  };

  return {
    db: {
      ...dbConfig,
      type: "postgres",
      synchronize: false,
      logging: true,
      keepConnectionAlive: true,
      migrationsTableName: "migration_typeorm",
      migrationsRun: false,
      autoLoadEntities: true,
      migrations: [join(__dirname, "./migrations/*{.ts,.js}")],
    } as TypeOrmModuleOptions,

    jwt: {
      secret: env.JWT_ACCESS_SECRET,
      signOptions: {
        expiresIn: "15m",
      },
    } as JwtModuleOptions,

    rabbitmq: {
      url: env.RABBITMQ_URL || "amqp://localhost:5674",
    },

    redis: {
      host: env.REDIS_HOST || "localhost",
      port: parseInt(env.REDIS_PORT || "6370", 10),
    },
  };
};

export const dbOptions = (configService: ConfigService) =>
  configService.get<TypeOrmModuleOptions>("db")!;

export const jwtOptions = (configService: ConfigService) =>
  configService.get<JwtModuleOptions>("jwt");

export const s3Options = (configService: ConfigService) =>
  configService.get("s3")!;
