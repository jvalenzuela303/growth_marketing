import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api/v1');

  // Explicitly mount socket.io adapter so WebSocket upgrades bind correctly
  app.useWebSocketAdapter(new IoAdapter(app));

  // Security headers
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS — supports comma-separated list in ALLOWED_ORIGINS
  const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:4000';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, server-to-server) and configured origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  });

  // ── Swagger / OpenAPI ────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('The Growth Engine — API')
    .setDescription(
      'API pública para integrar The Growth Engine con sistemas externos. ' +
      'Autenticación via Bearer JWT (endpoints /auth/login) o API Key en el header X-API-Key.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      'ApiKey',
    )
    .addTag('auth',             'Autenticación y tokens JWT')
    .addTag('leads',            'Gestión de leads y CRM')
    .addTag('funnels',          'Embudos de diagnóstico')
    .addTag('analytics',        'KPIs y métricas')
    .addTag('automation-flows', 'Flujos de automatización')
    .addTag('sms',              'Mensajería SMS via Twilio')
    .addTag('billing',          'Suscripciones y facturación')
    .addTag('api-keys',         'API Keys para acceso externo')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Growth Engine API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: -1,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend running on port ${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
