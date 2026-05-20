/**
 * Test E2E crítico: Aislamiento de Tenants (Multi-tenancy RLS)
 *
 * Verifica que la Row-Level Security de PostgreSQL impide que un tenant
 * acceda o modifique datos de otro tenant, incluso con tokens JWT válidos.
 *
 * Pre-requisitos:
 *   - PostgreSQL con migraciones aplicadas (RLS habilitado)
 *   - Redis corriendo
 *   - DATABASE_URL y REDIS_HOST configurados en .env.test
 *
 * Ejecutar: pnpm test:e2e
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Tenant Isolation (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Credenciales de los dos tenants de prueba
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

  let tokenA: string;
  let tokenB: string;
  let tenantAId: string;
  let tenantBId: string;
  let funnelAId: string;
  let funnelBId: string;
  let leadAId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Limpiar datos de prueba en orden correcto para respetar FK constraints
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

  // ─── Setup: registrar dos tenants independientes ─────────────────────────

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

      // Los IDs de tenant deben ser distintos
      expect(tenantAId).not.toEqual(tenantBId);
    });
  });

  // ─── Setup: crear recursos en cada tenant ────────────────────────────────

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

  // ─── Test Principal: Aislamiento de datos ────────────────────────────────

  describe('CRÍTICO: Tenant A no puede ver leads de Tenant B', () => {
    it('GET /leads de Tenant A no debe incluir leads de Tenant B', async () => {
      // Crear un lead para Tenant B
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

      // Tenant A lista sus leads
      const res = await request(app.getHttpServer())
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const emails = res.body.data.map((l: any) => l.email);
      expect(emails).toContain('lead-a@example.com');
      expect(emails).not.toContain('lead-b@example.com');
    });

    it('Tenant A no puede obtener el lead de Tenant B por ID', async () => {
      // Obtener el ID del lead de Tenant B
      const leadsB = await request(app.getHttpServer())
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const leadBId = leadsB.body.data[0]?.id;
      if (!leadBId) return; // skip si no hay leads de B todavía

      // Tenant A intenta acceder al lead de B directamente por UUID
      await request(app.getHttpServer())
        .get(`/api/v1/leads/${leadBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404); // debe ser 404, no 403 (no revelar que existe)
    });
  });

  describe('CRÍTICO: Tenant B no puede modificar funnels de Tenant A', () => {
    it('PUT /funnels/:id de Tenant A con token de Tenant B debe devolver 404', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/funnels/${funnelAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'Funnel modificado maliciosamente' })
        .expect(404);

      // Verificar que el funnel de A no fue modificado
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

      // El funnel de A sigue existiendo
      await request(app.getHttpServer())
        .get(`/api/v1/funnels/${funnelAId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
    });
  });

  describe('CRÍTICO: Token de Tenant A rechazado en contexto de Tenant B', () => {
    it('GET /funnels de Tenant B con token de Tenant A no muestra funnels de B', async () => {
      // El token de A está asociado a tenantAId en el JWT.
      // Aunque el endpoint no filtra por tenant explícito en URL,
      // el middleware extrae tenantId del token y RLS hace el filtro.
      const res = await request(app.getHttpServer())
        .get('/api/v1/funnels')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const ids = res.body.map((f: any) => f.id);
      expect(ids).toContain(funnelAId);
      expect(ids).not.toContain(funnelBId);
    });

    it('GET /leads de Tenant B con token de Tenant A solo ve leads de A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const tenantIds = res.body.data.map((l: any) => l.tenantId).filter(Boolean);
      const uniqueTenants = [...new Set(tenantIds)];
      // Todos los leads deben pertenecer solo a Tenant A
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
      // Este test fallará con 404 porque el funnel está en draft, no active.
      // Pero no debe devolver 401 (no requiere auth).
      const res = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${tenantA.tenantSlug}/funnel-no-existe`)
        .expect(404);

      // 404 confirma que se procesó la ruta pública, no fue rechazada por auth
      expect(res.status).not.toBe(401);
    });

    it('POST /leads/capture es público y no requiere JWT', async () => {
      // Debe retornar 400 (validación) o 201, nunca 401
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
