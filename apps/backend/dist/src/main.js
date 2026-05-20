"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { rawBody: true });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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