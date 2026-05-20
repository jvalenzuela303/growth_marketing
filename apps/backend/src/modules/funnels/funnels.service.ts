import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFunnelDto } from './dto/create-funnel.dto';
import { UpdateFunnelDto } from './dto/update-funnel.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

// ── Industry templates (static, no DB) ──────────────────────────────────────

const FUNNEL_TEMPLATES = [
  {
    id: 'saas',
    industry: 'SaaS / Software',
    icon: '💻',
    name: 'Diagnóstico SaaS',
    description: 'Califica leads de software B2B según su tamaño de equipo, pila tecnológica y urgencia.',
    estimatedConversion: '32%',
    questions: 5,
    quizConfig: {
      title: 'Diagnóstico SaaS',
      description: '¿Tu empresa está lista para escalar con software?',
      questions: [
        {
          id: 'q1', type: 'single_choice', text: '¿Cuántas personas usan herramientas digitales en tu empresa?',
          options: [
            { id: 'o1', text: '1–10 personas', score: 20 },
            { id: 'o2', text: '11–50 personas', score: 60 },
            { id: 'o3', text: '51–200 personas', score: 80 },
            { id: 'o4', text: 'Más de 200', score: 100 },
          ],
        },
        {
          id: 'q2', type: 'single_choice', text: '¿Cuál es tu principal dolor operacional?',
          options: [
            { id: 'o1', text: 'Procesos manuales / Excel', score: 100 },
            { id: 'o2', text: 'Falta de visibilidad en métricas', score: 80 },
            { id: 'o3', text: 'Integración entre herramientas', score: 60 },
            { id: 'o4', text: 'Escalabilidad del equipo', score: 40 },
          ],
        },
        {
          id: 'q3', type: 'single_choice', text: '¿En qué plazo necesitas resolver esto?',
          options: [
            { id: 'o1', text: 'Ahora mismo, es crítico', score: 100 },
            { id: 'o2', text: 'En los próximos 30 días', score: 70 },
            { id: 'o3', text: 'En el próximo trimestre', score: 40 },
            { id: 'o4', text: 'Solo estoy explorando', score: 10 },
          ],
        },
        {
          id: 'q4', type: 'single_choice', text: '¿Tienen presupuesto asignado para tecnología este año?',
          options: [
            { id: 'o1', text: 'Sí, ya aprobado', score: 100 },
            { id: 'o2', text: 'En proceso de aprobación', score: 60 },
            { id: 'o3', text: 'Dependemos del ROI demostrado', score: 30 },
            { id: 'o4', text: 'No tenemos presupuesto', score: 0 },
          ],
        },
        {
          id: 'q5', type: 'text', text: '¿Cuál es tu cargo y empresa?',
        },
      ],
    },
  },
  {
    id: 'ecommerce',
    industry: 'E-commerce / Retail',
    icon: '🛒',
    name: 'Diagnóstico E-commerce',
    description: 'Identifica el estado de madurez digital de tiendas online y necesidades de crecimiento.',
    estimatedConversion: '28%',
    questions: 5,
    quizConfig: {
      title: 'Diagnóstico E-commerce',
      description: '¿Tu tienda online está optimizada para crecer?',
      questions: [
        {
          id: 'q1', type: 'single_choice', text: '¿Cuántas ventas mensuales genera tu tienda?',
          options: [
            { id: 'o1', text: 'Menos de 50 ventas', score: 20 },
            { id: 'o2', text: '50–500 ventas', score: 50 },
            { id: 'o3', text: '500–2000 ventas', score: 80 },
            { id: 'o4', text: 'Más de 2000 ventas', score: 100 },
          ],
        },
        {
          id: 'q2', type: 'single_choice', text: '¿Cuál es tu mayor desafío actual?',
          options: [
            { id: 'o1', text: 'Conseguir más tráfico', score: 80 },
            { id: 'o2', text: 'Convertir visitas en ventas', score: 100 },
            { id: 'o3', text: 'Fidelizar clientes existentes', score: 60 },
            { id: 'o4', text: 'Gestionar inventario y logística', score: 40 },
          ],
        },
        {
          id: 'q3', type: 'single_choice', text: '¿En qué plataforma vendes principalmente?',
          options: [
            { id: 'o1', text: 'Shopify', score: 80 },
            { id: 'o2', text: 'WooCommerce', score: 70 },
            { id: 'o3', text: 'Mercado Libre / Amazon', score: 50 },
            { id: 'o4', text: 'Tienda propia personalizada', score: 90 },
          ],
        },
        {
          id: 'q4', type: 'single_choice', text: '¿Actualmente inviertes en publicidad digital?',
          options: [
            { id: 'o1', text: 'Sí, más de $1000 USD/mes', score: 100 },
            { id: 'o2', text: 'Sí, menos de $1000 USD/mes', score: 60 },
            { id: 'o3', text: 'Solo orgánico', score: 30 },
            { id: 'o4', text: 'No invertimos aún', score: 10 },
          ],
        },
        {
          id: 'q5', type: 'text', text: '¿Cuál es la URL de tu tienda?',
        },
      ],
    },
  },
  {
    id: 'inmobiliaria',
    industry: 'Inmobiliaria / Real Estate',
    icon: '🏠',
    name: 'Diagnóstico Inmobiliario',
    description: 'Califica compradores y vendedores según intención, capacidad financiera y urgencia.',
    estimatedConversion: '41%',
    questions: 5,
    quizConfig: {
      title: 'Diagnóstico Inmobiliario',
      description: '¿Estás listo para tu próxima propiedad?',
      questions: [
        {
          id: 'q1', type: 'single_choice', text: '¿Qué buscas hacer en los próximos 6 meses?',
          options: [
            { id: 'o1', text: 'Comprar mi primera vivienda', score: 100 },
            { id: 'o2', text: 'Comprar como inversión', score: 80 },
            { id: 'o3', text: 'Vender mi propiedad actual', score: 90 },
            { id: 'o4', text: 'Arrendar una propiedad', score: 50 },
          ],
        },
        {
          id: 'q2', type: 'single_choice', text: '¿Cuál es tu rango de presupuesto?',
          options: [
            { id: 'o1', text: 'Menos de $80.000 USD', score: 40 },
            { id: 'o2', text: '$80.000 – $200.000 USD', score: 70 },
            { id: 'o3', text: '$200.000 – $500.000 USD', score: 90 },
            { id: 'o4', text: 'Más de $500.000 USD', score: 100 },
          ],
        },
        {
          id: 'q3', type: 'single_choice', text: '¿Tienes financiamiento o crédito pre-aprobado?',
          options: [
            { id: 'o1', text: 'Sí, crédito aprobado', score: 100 },
            { id: 'o2', text: 'En proceso de aprobación', score: 70 },
            { id: 'o3', text: 'Pagaré al contado', score: 100 },
            { id: 'o4', text: 'Aún no he gestionado financiamiento', score: 20 },
          ],
        },
        {
          id: 'q4', type: 'single_choice', text: '¿Cuándo esperas concretar la operación?',
          options: [
            { id: 'o1', text: 'Este mes', score: 100 },
            { id: 'o2', text: 'En 1–3 meses', score: 80 },
            { id: 'o3', text: 'En 3–6 meses', score: 50 },
            { id: 'o4', text: 'Más de 6 meses', score: 20 },
          ],
        },
        {
          id: 'q5', type: 'text', text: '¿En qué ciudad o sector buscas?',
        },
      ],
    },
  },
  {
    id: 'coaching',
    industry: 'Coaching / Consultoría',
    icon: '🎯',
    name: 'Diagnóstico de Negocio',
    description: 'Evalúa el estado del negocio del prospecto e identifica el área de mayor impacto.',
    estimatedConversion: '38%',
    questions: 5,
    quizConfig: {
      title: 'Diagnóstico de Negocio',
      description: '¿En qué área de tu negocio necesitas más apoyo?',
      questions: [
        {
          id: 'q1', type: 'single_choice', text: '¿Cuánto factura tu empresa mensualmente?',
          options: [
            { id: 'o1', text: 'Menos de $3.000 USD', score: 30 },
            { id: 'o2', text: '$3.000 – $15.000 USD', score: 60 },
            { id: 'o3', text: '$15.000 – $50.000 USD', score: 80 },
            { id: 'o4', text: 'Más de $50.000 USD', score: 100 },
          ],
        },
        {
          id: 'q2', type: 'single_choice', text: '¿Cuál es tu mayor freno de crecimiento?',
          options: [
            { id: 'o1', text: 'No tengo suficientes clientes', score: 100 },
            { id: 'o2', text: 'Cobro poco por mis servicios', score: 80 },
            { id: 'o3', text: 'No tengo tiempo para crecer', score: 70 },
            { id: 'o4', text: 'Mi equipo no da abasto', score: 60 },
          ],
        },
        {
          id: 'q3', type: 'single_choice', text: '¿Has invertido en mentoría o consultoría antes?',
          options: [
            { id: 'o1', text: 'Sí, con excelentes resultados', score: 90 },
            { id: 'o2', text: 'Sí, pero sin buenos resultados', score: 50 },
            { id: 'o3', text: 'No, pero estoy interesado', score: 70 },
            { id: 'o4', text: 'No creo en ello', score: 10 },
          ],
        },
        {
          id: 'q4', type: 'single_choice', text: '¿Cuánto estarías dispuesto a invertir mensualmente?',
          options: [
            { id: 'o1', text: 'Menos de $500 USD', score: 20 },
            { id: 'o2', text: '$500 – $2.000 USD', score: 60 },
            { id: 'o3', text: '$2.000 – $5.000 USD', score: 90 },
            { id: 'o4', text: 'Más de $5.000 USD', score: 100 },
          ],
        },
        {
          id: 'q5', type: 'text', text: '¿Cuál es tu nombre y tu negocio?',
        },
      ],
    },
  },
  {
    id: 'salud',
    industry: 'Salud / Bienestar',
    icon: '🏥',
    name: 'Diagnóstico de Salud',
    description: 'Califica pacientes potenciales según síntomas, urgencia y disposición a consultar.',
    estimatedConversion: '45%',
    questions: 5,
    quizConfig: {
      title: 'Diagnóstico de Salud',
      description: '¿Cuándo fue tu última revisión de salud?',
      questions: [
        {
          id: 'q1', type: 'single_choice', text: '¿Con qué frecuencia visitas a un especialista de salud?',
          options: [
            { id: 'o1', text: 'Nunca o casi nunca', score: 100 },
            { id: 'o2', text: 'Solo cuando hay urgencia', score: 80 },
            { id: 'o3', text: '1 vez al año como control', score: 50 },
            { id: 'o4', text: 'Regularmente, cada trimestre', score: 20 },
          ],
        },
        {
          id: 'q2', type: 'single_choice', text: '¿Cuál es tu mayor preocupación de salud hoy?',
          options: [
            { id: 'o1', text: 'Dolor crónico o muscular', score: 90 },
            { id: 'o2', text: 'Estrés o salud mental', score: 100 },
            { id: 'o3', text: 'Control de peso', score: 80 },
            { id: 'o4', text: 'Revisión preventiva general', score: 60 },
          ],
        },
        {
          id: 'q3', type: 'single_choice', text: '¿Tienes seguro de salud o cobertura médica?',
          options: [
            { id: 'o1', text: 'Sí, seguro privado completo', score: 100 },
            { id: 'o2', text: 'Sí, cobertura básica', score: 60 },
            { id: 'o3', text: 'Solo Fonasa / seguro público', score: 40 },
            { id: 'o4', text: 'No tengo seguro actualmente', score: 20 },
          ],
        },
        {
          id: 'q4', type: 'single_choice', text: '¿Qué tan urgente es para ti atenderte?',
          options: [
            { id: 'o1', text: 'Muy urgente, necesito cita esta semana', score: 100 },
            { id: 'o2', text: 'Este mes si se puede', score: 70 },
            { id: 'o3', text: 'En algún momento próximo', score: 40 },
            { id: 'o4', text: 'Sin apuro, solo quiero información', score: 10 },
          ],
        },
        {
          id: 'q5', type: 'text', text: '¿Cuál es tu nombre y tu correo de contacto?',
        },
      ],
    },
  },
  {
    id: 'agencia',
    industry: 'Agencia de Marketing',
    icon: '📣',
    name: 'Diagnóstico de Marketing Digital',
    description: 'Detecta brechas en la estrategia digital del cliente y justifica una propuesta de servicios.',
    estimatedConversion: '35%',
    questions: 5,
    quizConfig: {
      title: 'Diagnóstico de Marketing Digital',
      description: '¿Tu empresa está aprovechando el marketing digital?',
      questions: [
        {
          id: 'q1', type: 'single_choice', text: '¿Cuánto invierten mensualmente en publicidad digital?',
          options: [
            { id: 'o1', text: 'No invertimos', score: 100 },
            { id: 'o2', text: 'Menos de $500 USD', score: 80 },
            { id: 'o3', text: '$500 – $3.000 USD', score: 60 },
            { id: 'o4', text: 'Más de $3.000 USD', score: 40 },
          ],
        },
        {
          id: 'q2', type: 'single_choice', text: '¿Miden el ROI de sus campañas?',
          options: [
            { id: 'o1', text: 'No, no sabemos cómo medirlo', score: 100 },
            { id: 'o2', text: 'Solo vemos métricas básicas (likes, clics)', score: 70 },
            { id: 'o3', text: 'Sí, usamos Analytics y atribución', score: 30 },
            { id: 'o4', text: 'Tenemos un sistema propio de BI', score: 10 },
          ],
        },
        {
          id: 'q3', type: 'single_choice', text: '¿Tienen presencia activa en redes sociales?',
          options: [
            { id: 'o1', text: 'No tenemos o está abandonada', score: 100 },
            { id: 'o2', text: 'Publicamos 1–2 veces por semana', score: 60 },
            { id: 'o3', text: 'Publicamos diariamente', score: 30 },
            { id: 'o4', text: 'Tenemos equipo interno dedicado', score: 10 },
          ],
        },
        {
          id: 'q4', type: 'single_choice', text: '¿Qué resultado buscas en los próximos 90 días?',
          options: [
            { id: 'o1', text: 'Generar más leads calificados', score: 100 },
            { id: 'o2', text: 'Aumentar ventas directas', score: 90 },
            { id: 'o3', text: 'Mejorar reconocimiento de marca', score: 60 },
            { id: 'o4', text: 'Fidelizar clientes actuales', score: 50 },
          ],
        },
        {
          id: 'q5', type: 'text', text: '¿Nombre de tu empresa y rubro principal?',
        },
      ],
    },
  },
] as const;

const PLAN_FUNNEL_LIMITS: Record<string, number> = {
  starter: 1,
  growth: 5,
  scale: 20,
  agency: 100,
};

@Injectable()
export class FunnelsService {
  private readonly logger = new Logger(FunnelsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateFunnelDto) {
    // Verificar límite de funnels según plan del tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, maxFunnels: true },
    });

    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

    const funnelCount = await this.prisma.withTenant(tenantId, () =>
      this.prisma.funnel.count({ where: { tenantId } }),
    );

    const limit = PLAN_FUNNEL_LIMITS[tenant.plan] ?? tenant.maxFunnels;
    if (funnelCount >= limit) {
      throw new ForbiddenException(
        `El plan "${tenant.plan}" permite un máximo de ${limit} funnel(s). Actualiza tu plan para crear más.`,
      );
    }

    // Verificar unicidad de slug dentro del tenant
    const existing = await this.prisma.withTenant(tenantId, () =>
      this.prisma.funnel.findFirst({ where: { tenantId, slug: dto.slug } }),
    );
    if (existing) {
      throw new ConflictException(`Ya existe un funnel con el slug "${dto.slug}".`);
    }

    return this.prisma.withTenant(tenantId, () =>
      this.prisma.funnel.create({
        data: {
          tenantId,
          createdBy: userId,
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          ...(dto.quizConfig && { quizConfig: dto.quizConfig as any }),
          ...(dto.landingConfig && { landingConfig: dto.landingConfig as any }),
          ...(dto.resultsConfig && { resultsConfig: dto.resultsConfig as any }),
          ...(dto.scoringRules && { scoringRules: dto.scoringRules as any }),
          status: 'draft',
        },
      }),
    );
  }

  async findAll(tenantId: string) {
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.funnel.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          status: true,
          totalViews: true,
          totalStarts: true,
          totalCompletions: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    );
  }

  async findOne(tenantId: string, funnelId: string) {
    const funnel = await this.prisma.withTenant(tenantId, () =>
      this.prisma.funnel.findFirst({
        where: { id: funnelId, tenantId },
      }),
    );

    if (!funnel) throw new NotFoundException('Funnel no encontrado.');
    return funnel;
  }

  async update(tenantId: string, funnelId: string, dto: UpdateFunnelDto) {
    await this.findOne(tenantId, funnelId);

    return this.prisma.withTenant(tenantId, () =>
      this.prisma.funnel.update({
        where: { id: funnelId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.quizConfig && { quizConfig: dto.quizConfig as any }),
          ...(dto.landingConfig && { landingConfig: dto.landingConfig as any }),
          ...(dto.resultsConfig && { resultsConfig: dto.resultsConfig as any }),
          ...(dto.scoringRules !== undefined && { scoringRules: dto.scoringRules as any }),
        },
      }),
    );
  }

  async remove(tenantId: string, funnelId: string) {
    const funnel = await this.findOne(tenantId, funnelId);

    if (funnel.status === 'active') {
      throw new ForbiddenException('No se puede eliminar un funnel activo. Pausa o archívalo primero.');
    }

    return this.prisma.withTenant(tenantId, () =>
      this.prisma.funnel.delete({ where: { id: funnelId } }),
    );
  }

  async publish(tenantId: string, funnelId: string) {
    const funnel = await this.findOne(tenantId, funnelId);

    if (funnel.status === 'active') {
      throw new ConflictException('El funnel ya está publicado.');
    }

    const quizConfig = funnel.quizConfig as any;
    if (!quizConfig?.questions?.length) {
      throw new ForbiddenException('El funnel debe tener al menos una pregunta antes de publicarse.');
    }

    return this.prisma.withTenant(tenantId, () =>
      this.prisma.funnel.update({
        where: { id: funnelId },
        data: {
          status: 'active',
          publishedAt: new Date(),
        },
      }),
    );
  }

  // ─── Industry Templates ────────────────────────────────────────────────────

  /**
   * Returns static in-memory templates — no DB required.
   * Each template has a prebuilt quizConfig ready to be used on funnel creation.
   */
  getTemplates() {
    return FUNNEL_TEMPLATES;
  }

  /**
   * POST /api/v1/funnels/from-template
   * Creates a new draft funnel seeded from a template's quizConfig.
   */
  async createFromTemplate(
    tenantId: string,
    userId: string,
    templateId: string,
    overrides: { name?: string; slug?: string },
  ) {
    const tpl = FUNNEL_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) throw new NotFoundException(`Plantilla "${templateId}" no encontrada.`);

    const name = overrides.name ?? tpl.name;
    const slug = overrides.slug ?? this.toSlug(name);

    return this.create(tenantId, userId, {
      name,
      slug,
      description: tpl.description,
      quizConfig: tpl.quizConfig as any,
    });
  }

  private toSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
  }

  // ─── A/B Testing: Funnel Variants ────────────────────────────────────────

  async getVariants(tenantId: string, funnelId: string) {
    await this.findOne(tenantId, funnelId); // verifica propiedad
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.funnelVariant.findMany({
        where: { funnelId, tenantId },
        orderBy: { createdAt: 'asc' },
      }),
    );
  }

  async createVariant(tenantId: string, funnelId: string, dto: CreateVariantDto) {
    const funnel = await this.findOne(tenantId, funnelId);

    const existingVariants = await this.prisma.withTenant(tenantId, () =>
      this.prisma.funnelVariant.findMany({
        where: { funnelId, tenantId },
      }),
    );

    const isFirstVariant = existingVariants.length === 0;

    if (isFirstVariant) {
      // Auto-crear variante de control basada en la config actual del funnel
      const splitPerVariant = Math.floor(100 / 2); // control + nueva variante

      await this.prisma.withTenant(tenantId, () =>
        this.prisma.funnelVariant.create({
          data: {
            funnelId,
            tenantId,
            name: 'Control',
            trafficSplit: splitPerVariant,
            isControl: true,
            isActive: true,
            quizConfig: (funnel.quizConfig as any) ?? {},
            landingConfig: (funnel.landingConfig as any) ?? {},
            resultsConfig: (funnel.resultsConfig as any) ?? {},
          },
        }),
      );

      return this.prisma.withTenant(tenantId, () =>
        this.prisma.funnelVariant.create({
          data: {
            funnelId,
            tenantId,
            name: dto.name,
            trafficSplit: splitPerVariant,
            isControl: dto.isControl ?? false,
            isActive: true,
          },
        }),
      );
    }

    return this.prisma.withTenant(tenantId, () =>
      this.prisma.funnelVariant.create({
        data: {
          funnelId,
          tenantId,
          name: dto.name,
          trafficSplit: dto.trafficSplit,
          isControl: dto.isControl ?? false,
          isActive: true,
        },
      }),
    );
  }

  async updateVariant(
    tenantId: string,
    funnelId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    await this.findOne(tenantId, funnelId); // verifica propiedad del funnel

    const variant = await this.prisma.withTenant(tenantId, () =>
      this.prisma.funnelVariant.findFirst({
        where: { id: variantId, funnelId, tenantId },
      }),
    );

    if (!variant) {
      throw new NotFoundException('Variante no encontrada.');
    }

    return this.prisma.withTenant(tenantId, () =>
      this.prisma.funnelVariant.update({
        where: { id: variantId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.trafficSplit !== undefined && { trafficSplit: dto.trafficSplit }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      }),
    );
  }

  async deleteVariant(tenantId: string, funnelId: string, variantId: string) {
    await this.findOne(tenantId, funnelId); // verifica propiedad del funnel

    const variant = await this.prisma.withTenant(tenantId, () =>
      this.prisma.funnelVariant.findFirst({
        where: { id: variantId, funnelId, tenantId },
      }),
    );

    if (!variant) {
      throw new NotFoundException('Variante no encontrada.');
    }

    if (variant.isControl) {
      // Solo se puede eliminar el control si es la única variante restante
      const otherVariantsCount = await this.prisma.withTenant(tenantId, () =>
        this.prisma.funnelVariant.count({
          where: { funnelId, tenantId, id: { not: variantId } },
        }),
      );

      if (otherVariantsCount > 0) {
        throw new ForbiddenException(
          'No se puede eliminar la variante de control mientras existen otras variantes.',
        );
      }
    }

    return this.prisma.withTenant(tenantId, () =>
      this.prisma.funnelVariant.delete({ where: { id: variantId } }),
    );
  }
}
