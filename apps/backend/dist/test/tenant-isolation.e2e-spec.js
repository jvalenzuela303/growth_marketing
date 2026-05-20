"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const request = require("supertest");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/database/prisma.service");
describe('Tenant Isolation (E2E)', () => {
    let app;
    let prisma;
    const tenantA = {
        tenantSlug: `test-tenant-a-${Date.now()}`,
        tenantName: 'Tenant A Tests',
        name: 'Owner A',
        email: `owner-a-${Date.now()}@test.com`,
        password: 'TestPassword123!',
    };
    const tenantB = {
        tenantSlug: `test-tenant-b-${Date.now()}`,
        tenantName: 'Tenant B Tests',
        name: 'Owner B',
        email: `owner-b-${Date.now()}@test.com`,
        password: 'TestPassword456!',
    };
    let tokenA;
    let tokenB;
    let tenantAId;
    let tenantBId;
    let funnelAId;
    let funnelBId;
    let leadAId;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
        await app.init();
        prisma = app.get(prisma_service_1.PrismaService);
    });
    afterAll(async () => {
        if (leadAId) {
            await prisma.lead.deleteMany({ where: { id: leadAId } });
        }
        if (funnelAId) {
            await prisma.funnel.deleteMany({ where: { id: funnelAId } });
        }
        if (funnelBId) {
            await prisma.funnel.deleteMany({ where: { id: funnelBId } });
        }
        if (tenantAId) {
            await prisma.user.deleteMany({ where: { tenantId: tenantAId } });
            await prisma.tenant.deleteMany({ where: { id: tenantAId } });
        }
        if (tenantBId) {
            await prisma.user.deleteMany({ where: { tenantId: tenantBId } });
            await prisma.tenant.deleteMany({ where: { id: tenantBId } });
        }
        await app.close();
    });
    describe('Setup: Registro de tenants', () => {
        it('debería registrar Tenant A exitosamente', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send(tenantA)
                .expect(201);
            expect(res.body.accessToken).toBeDefined();
            expect(res.body.tenantId).toBeDefined();
            tokenA = res.body.accessToken;
            tenantAId = res.body.tenantId;
        });
        it('debería registrar Tenant B exitosamente', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send(tenantB)
                .expect(201);
            expect(res.body.accessToken).toBeDefined();
            tokenB = res.body.accessToken;
            tenantBId = res.body.tenantId;
            expect(tenantAId).not.toEqual(tenantBId);
        });
    });
    describe('Setup: Creación de funnels', () => {
        it('Tenant A puede crear su funnel', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/funnels')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({
                name: 'Funnel de Tenant A',
                slug: `funnel-a-${Date.now()}`,
                description: 'Funnel de prueba para Tenant A',
            })
                .expect(201);
            funnelAId = res.body.id;
            expect(res.body.tenantId).toBe(tenantAId);
        });
        it('Tenant B puede crear su funnel', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/funnels')
                .set('Authorization', `Bearer ${tokenB}`)
                .send({
                name: 'Funnel de Tenant B',
                slug: `funnel-b-${Date.now()}`,
            })
                .expect(201);
            funnelBId = res.body.id;
            expect(res.body.tenantId).toBe(tenantBId);
        });
        it('Tenant A puede capturar un lead en su funnel', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/leads/capture')
                .send({
                tenantId: tenantAId,
                funnelId: funnelAId,
                email: 'lead-a@example.com',
                firstName: 'Lead',
                lastName: 'A',
                source: 'organic',
            })
                .expect(201);
            leadAId = res.body.id;
            expect(res.body.tenantId).toBe(tenantAId);
        });
    });
    describe('CRÍTICO: Tenant A no puede ver leads de Tenant B', () => {
        it('GET /leads de Tenant A no debe incluir leads de Tenant B', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/leads/capture')
                .send({
                tenantId: tenantBId,
                funnelId: funnelBId,
                email: 'lead-b@example.com',
                firstName: 'Lead',
                lastName: 'B',
            })
                .expect(201);
            const res = await request(app.getHttpServer())
                .get('/api/v1/leads')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);
            const emails = res.body.data.map((l) => l.email);
            expect(emails).toContain('lead-a@example.com');
            expect(emails).not.toContain('lead-b@example.com');
        });
        it('Tenant A no puede obtener el lead de Tenant B por ID', async () => {
            const leadsB = await request(app.getHttpServer())
                .get('/api/v1/leads')
                .set('Authorization', `Bearer ${tokenB}`)
                .expect(200);
            const leadBId = leadsB.body.data[0]?.id;
            if (!leadBId)
                return;
            await request(app.getHttpServer())
                .get(`/api/v1/leads/${leadBId}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(404);
        });
    });
    describe('CRÍTICO: Tenant B no puede modificar funnels de Tenant A', () => {
        it('PUT /funnels/:id de Tenant A con token de Tenant B debe devolver 404', async () => {
            await request(app.getHttpServer())
                .put(`/api/v1/funnels/${funnelAId}`)
                .set('Authorization', `Bearer ${tokenB}`)
                .send({ name: 'Funnel modificado maliciosamente' })
                .expect(404);
            const funnelA = await request(app.getHttpServer())
                .get(`/api/v1/funnels/${funnelAId}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);
            expect(funnelA.body.name).toBe('Funnel de Tenant A');
        });
        it('DELETE /funnels/:id de Tenant A con token de Tenant B debe devolver 404', async () => {
            await request(app.getHttpServer())
                .delete(`/api/v1/funnels/${funnelAId}`)
                .set('Authorization', `Bearer ${tokenB}`)
                .expect(404);
            await request(app.getHttpServer())
                .get(`/api/v1/funnels/${funnelAId}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);
        });
    });
    describe('CRÍTICO: Token de Tenant A rechazado en contexto de Tenant B', () => {
        it('GET /funnels de Tenant B con token de Tenant A no muestra funnels de B', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/funnels')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);
            const ids = res.body.map((f) => f.id);
            expect(ids).toContain(funnelAId);
            expect(ids).not.toContain(funnelBId);
        });
        it('GET /leads de Tenant B con token de Tenant A solo ve leads de A', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/leads')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);
            const tenantIds = res.body.data.map((l) => l.tenantId).filter(Boolean);
            const uniqueTenants = [...new Set(tenantIds)];
            if (uniqueTenants.length > 0) {
                expect(uniqueTenants).toEqual([tenantAId]);
            }
        });
        it('Solicitud sin token a ruta protegida devuelve 401', async () => {
            await request(app.getHttpServer()).get('/api/v1/leads').expect(401);
        });
        it('Token expirado o malformado devuelve 401', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/leads')
                .set('Authorization', 'Bearer token.malformado.invalido')
                .expect(401);
        });
    });
    describe('Rutas públicas accesibles sin autenticación', () => {
        it('GET /quiz/:tenantSlug/:funnelSlug es público y no requiere JWT', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/quiz/${tenantA.tenantSlug}/funnel-no-existe`)
                .expect(404);
            expect(res.status).not.toBe(401);
        });
        it('POST /leads/capture es público y no requiere JWT', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/leads/capture')
                .send({
                tenantId: tenantAId,
                funnelId: funnelAId,
                email: 'lead-publico@test.com',
            });
            expect(res.status).not.toBe(401);
        });
    });
});
//# sourceMappingURL=tenant-isolation.e2e-spec.js.map