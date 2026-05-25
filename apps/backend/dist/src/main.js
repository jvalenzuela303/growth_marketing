"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const helmet_1 = require("helmet");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { rawBody: true });
    app.setGlobalPrefix('api/v1');
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    app.use((0, helmet_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:4000';
    const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error(`CORS policy: origin ${origin} not allowed`));
            }
        },
        credentials: true,
    });
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('The Growth Engine — API')
        .setDescription('API pública para integrar The Growth Engine con sistemas externos. ' +
        'Autenticación via Bearer JWT (endpoints /auth/login) o API Key en el header X-API-Key.')
        .setVersion('1.0.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
        .addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-Key' }, 'ApiKey')
        .addTag('auth', 'Autenticación y tokens JWT')
        .addTag('leads', 'Gestión de leads y CRM')
        .addTag('funnels', 'Embudos de diagnóstico')
        .addTag('analytics', 'KPIs y métricas')
        .addTag('automation-flows', 'Flujos de automatización')
        .addTag('sms', 'Mensajería SMS via Twilio')
        .addTag('billing', 'Suscripciones y facturación')
        .addTag('api-keys', 'API Keys para acceso externo')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
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
//# sourceMappingURL=main.js.map