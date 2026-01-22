import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe, VersioningType } from '@nestjs/common';
import { ApiExceptionFilter } from './shared/exceptions/api-exception.filter';
import { SuccessResponseInterceptor } from './shared/interceptors/success-reponse.interceptor';
import { RequestIdMiddleware } from './shared/middleware/requestId.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean)
    ?? ['http://localhost:3001', 'http://127.0.0.1:3001'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  app.setGlobalPrefix('api')

  app.enableVersioning({
    type: VersioningType.URI
  })

  app.use(new RequestIdMiddleware().use)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        return new BadRequestException(errors)
      }
    })
  )

  app.useGlobalFilters(new ApiExceptionFilter());

  app.useGlobalInterceptors(new SuccessResponseInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
