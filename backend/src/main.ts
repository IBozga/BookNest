import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security: Global API prefix
  app.setGlobalPrefix('api/v1');

  // Security: Strict CORS policy for local development
  app.enableCors({
    origin: [
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://localhost:3000',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Security: Input validation and sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Security: Structured Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // OpenAPI Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('BookNest API')
    .setDescription('OpenAPI 3.0 specification for BookNest catalogue, cart, points, checkout, and recommendations.')
    .setVersion('1.0.0')
    .addTag('Catalogue')
    .addTag('Cart')
    .addTag('Recommendations')
    .addTag('Checkout & Payment')
    .addTag('Orders & History')
    .addTag('User & Addresses')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Security: Bind strictly to 127.0.0.1 (never 0.0.0.0)
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '127.0.0.1';

  await app.listen(port, host);
  logger.log(`BookNest Backend running securely on http://${host}:${port}/api/v1`);
  logger.log(`Interactive Swagger OpenAPI documentation available on http://${host}:${port}/docs`);
}

bootstrap();
