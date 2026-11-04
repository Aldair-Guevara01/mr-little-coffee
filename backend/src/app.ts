import 'reflect-metadata';
import { ArgumentsHost, Catch, Controller, ExceptionFilter, Get, Global, HttpException, Inject, Injectable, Logger, Module, OnApplicationShutdown, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { AppConfig, CONFIG, loadConfig } from './config';
import { documentResponses } from './openapi';
import { createDataSource } from './database/data-source';
import { CatalogModule, ContactModule, EventsModule } from './catalog';
import { AuthModule, ProfileModule } from './auth';
import { ReservationsModule } from './reservations';
import { CsrfGuard, RateGuard, SecurityModule } from './security';
import { AdminModule } from './admin';

@Controller('health')
class HealthController {
  constructor(@Inject(DataSource) private readonly db: DataSource, @Inject(CONFIG) private readonly config: AppConfig) {}
  @Get() async health() {
    await this.db.query('SELECT 1');
    return { status: 'ok', database: 'ok', demoAccountsEnabled: this.config.demoAccountsEnabled };
  }
}

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  async onApplicationShutdown() { if (this.db.isInitialized) await this.db.destroy(); }
}
@Global()
@Module({
  providers: [
    { provide: CONFIG, useFactory: () => loadConfig() },
    { provide: DataSource, inject: [CONFIG], useFactory: async (config: AppConfig) => createDataSource(config.databaseUrl).initialize() },
    DatabaseLifecycle,
  ], exports: [CONFIG, DataSource],
})
class InfrastructureModule {}
@Module({
  imports: [InfrastructureModule, SecurityModule, AuthModule, CatalogModule, EventsModule, ContactModule, ProfileModule, ReservationsModule, AdminModule],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: CsrfGuard }, { provide: APP_GUARD, useClass: RateGuard }],
})
export class AppModule {}
@Catch()
class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException) {
      const payload = error.getResponse();
      const message = typeof payload === 'string' ? payload : ('message' in payload ? payload.message : error.message);
      response.status(error.getStatus()).json({ statusCode: error.getStatus(), message });
      return;
    }
    // Do not return query text, stack traces, configuration or connection URLs.
    Logger.error(error instanceof Error ? error.name : 'UnknownError', 'Unhandled API error');
    response.status(500).json({ statusCode: 500, message: 'No fue posible completar la solicitud. Inténtalo nuevamente.' });
  }
}
export async function createApplication(quiet = false) {
  // Validate before database connection or HTTP listener initialization.
  const config = loadConfig();
  const app = await NestFactory.create(AppModule, { bodyParser: false, logger: quiet ? false : ['log', 'warn', 'error'] });
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(json({ limit: '16kb' }));
  app.use(cookieParser());
  app.use((_request: Request, response: Response, next: () => void) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  app.enableCors({ origin: config.origins, credentials: true, methods: ['GET', 'POST', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Idempotency-Key'] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true }));
  app.useGlobalFilters(new SafeExceptionFilter());
  const swagger = new DocumentBuilder().setTitle('Mr. Little Coffee API').setVersion('1.0').setDescription('Sprints 2 y 3 y consulta administrativa. Escrituras requieren Origin permitido y X-CSRF-Token obtenido en GET /api/csrf. Administración requiere sesión con rol admin. Cuentas demo solo fuera de producción y con flag explícito.').addCookieAuth('mlc_session').addApiKey({ type: 'apiKey', in: 'header', name: 'X-CSRF-Token' }, 'csrf').build();
  SwaggerModule.setup('api/docs', app, documentResponses(SwaggerModule.createDocument(app, swagger)));
  app.enableShutdownHooks();
  await app.init();
  return app;
}
