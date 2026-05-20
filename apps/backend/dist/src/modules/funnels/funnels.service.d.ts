import { PrismaService } from '../../database/prisma.service';
import { CreateFunnelDto } from './dto/create-funnel.dto';
import { UpdateFunnelDto } from './dto/update-funnel.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
export declare class FunnelsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(tenantId: string, userId: string, dto: CreateFunnelDto): Promise<{
        name: string;
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        status: string;
        createdBy: string | null;
        quizConfig: import("@prisma/client/runtime/library").JsonValue;
        landingConfig: import("@prisma/client/runtime/library").JsonValue;
        resultsConfig: import("@prisma/client/runtime/library").JsonValue;
        scoringRules: import("@prisma/client/runtime/library").JsonValue | null;
        publishedAt: Date | null;
        totalViews: number;
        totalStarts: number;
        totalCompletions: number;
        abTestEnabled: boolean;
    }>;
    findAll(tenantId: string): Promise<{
        name: string;
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        status: string;
        publishedAt: Date;
        totalViews: number;
        totalStarts: number;
        totalCompletions: number;
    }[]>;
    findOne(tenantId: string, funnelId: string): Promise<{
        name: string;
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        status: string;
        createdBy: string | null;
        quizConfig: import("@prisma/client/runtime/library").JsonValue;
        landingConfig: import("@prisma/client/runtime/library").JsonValue;
        resultsConfig: import("@prisma/client/runtime/library").JsonValue;
        scoringRules: import("@prisma/client/runtime/library").JsonValue | null;
        publishedAt: Date | null;
        totalViews: number;
        totalStarts: number;
        totalCompletions: number;
        abTestEnabled: boolean;
    }>;
    update(tenantId: string, funnelId: string, dto: UpdateFunnelDto): Promise<{
        name: string;
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        status: string;
        createdBy: string | null;
        quizConfig: import("@prisma/client/runtime/library").JsonValue;
        landingConfig: import("@prisma/client/runtime/library").JsonValue;
        resultsConfig: import("@prisma/client/runtime/library").JsonValue;
        scoringRules: import("@prisma/client/runtime/library").JsonValue | null;
        publishedAt: Date | null;
        totalViews: number;
        totalStarts: number;
        totalCompletions: number;
        abTestEnabled: boolean;
    }>;
    remove(tenantId: string, funnelId: string): Promise<{
        name: string;
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        status: string;
        createdBy: string | null;
        quizConfig: import("@prisma/client/runtime/library").JsonValue;
        landingConfig: import("@prisma/client/runtime/library").JsonValue;
        resultsConfig: import("@prisma/client/runtime/library").JsonValue;
        scoringRules: import("@prisma/client/runtime/library").JsonValue | null;
        publishedAt: Date | null;
        totalViews: number;
        totalStarts: number;
        totalCompletions: number;
        abTestEnabled: boolean;
    }>;
    publish(tenantId: string, funnelId: string): Promise<{
        name: string;
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        status: string;
        createdBy: string | null;
        quizConfig: import("@prisma/client/runtime/library").JsonValue;
        landingConfig: import("@prisma/client/runtime/library").JsonValue;
        resultsConfig: import("@prisma/client/runtime/library").JsonValue;
        scoringRules: import("@prisma/client/runtime/library").JsonValue | null;
        publishedAt: Date | null;
        totalViews: number;
        totalStarts: number;
        totalCompletions: number;
        abTestEnabled: boolean;
    }>;
    getTemplates(): readonly [{
        readonly id: "saas";
        readonly industry: "SaaS / Software";
        readonly icon: "💻";
        readonly name: "Diagnóstico SaaS";
        readonly description: "Califica leads de software B2B según su tamaño de equipo, pila tecnológica y urgencia.";
        readonly estimatedConversion: "32%";
        readonly questions: 5;
        readonly quizConfig: {
            readonly title: "Diagnóstico SaaS";
            readonly description: "¿Tu empresa está lista para escalar con software?";
            readonly questions: readonly [{
                readonly id: "q1";
                readonly type: "single_choice";
                readonly text: "¿Cuántas personas usan herramientas digitales en tu empresa?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "1–10 personas";
                    readonly score: 20;
                }, {
                    readonly id: "o2";
                    readonly text: "11–50 personas";
                    readonly score: 60;
                }, {
                    readonly id: "o3";
                    readonly text: "51–200 personas";
                    readonly score: 80;
                }, {
                    readonly id: "o4";
                    readonly text: "Más de 200";
                    readonly score: 100;
                }];
            }, {
                readonly id: "q2";
                readonly type: "single_choice";
                readonly text: "¿Cuál es tu principal dolor operacional?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Procesos manuales / Excel";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "Falta de visibilidad en métricas";
                    readonly score: 80;
                }, {
                    readonly id: "o3";
                    readonly text: "Integración entre herramientas";
                    readonly score: 60;
                }, {
                    readonly id: "o4";
                    readonly text: "Escalabilidad del equipo";
                    readonly score: 40;
                }];
            }, {
                readonly id: "q3";
                readonly type: "single_choice";
                readonly text: "¿En qué plazo necesitas resolver esto?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Ahora mismo, es crítico";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "En los próximos 30 días";
                    readonly score: 70;
                }, {
                    readonly id: "o3";
                    readonly text: "En el próximo trimestre";
                    readonly score: 40;
                }, {
                    readonly id: "o4";
                    readonly text: "Solo estoy explorando";
                    readonly score: 10;
                }];
            }, {
                readonly id: "q4";
                readonly type: "single_choice";
                readonly text: "¿Tienen presupuesto asignado para tecnología este año?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Sí, ya aprobado";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "En proceso de aprobación";
                    readonly score: 60;
                }, {
                    readonly id: "o3";
                    readonly text: "Dependemos del ROI demostrado";
                    readonly score: 30;
                }, {
                    readonly id: "o4";
                    readonly text: "No tenemos presupuesto";
                    readonly score: 0;
                }];
            }, {
                readonly id: "q5";
                readonly type: "text";
                readonly text: "¿Cuál es tu cargo y empresa?";
            }];
        };
    }, {
        readonly id: "ecommerce";
        readonly industry: "E-commerce / Retail";
        readonly icon: "🛒";
        readonly name: "Diagnóstico E-commerce";
        readonly description: "Identifica el estado de madurez digital de tiendas online y necesidades de crecimiento.";
        readonly estimatedConversion: "28%";
        readonly questions: 5;
        readonly quizConfig: {
            readonly title: "Diagnóstico E-commerce";
            readonly description: "¿Tu tienda online está optimizada para crecer?";
            readonly questions: readonly [{
                readonly id: "q1";
                readonly type: "single_choice";
                readonly text: "¿Cuántas ventas mensuales genera tu tienda?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Menos de 50 ventas";
                    readonly score: 20;
                }, {
                    readonly id: "o2";
                    readonly text: "50–500 ventas";
                    readonly score: 50;
                }, {
                    readonly id: "o3";
                    readonly text: "500–2000 ventas";
                    readonly score: 80;
                }, {
                    readonly id: "o4";
                    readonly text: "Más de 2000 ventas";
                    readonly score: 100;
                }];
            }, {
                readonly id: "q2";
                readonly type: "single_choice";
                readonly text: "¿Cuál es tu mayor desafío actual?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Conseguir más tráfico";
                    readonly score: 80;
                }, {
                    readonly id: "o2";
                    readonly text: "Convertir visitas en ventas";
                    readonly score: 100;
                }, {
                    readonly id: "o3";
                    readonly text: "Fidelizar clientes existentes";
                    readonly score: 60;
                }, {
                    readonly id: "o4";
                    readonly text: "Gestionar inventario y logística";
                    readonly score: 40;
                }];
            }, {
                readonly id: "q3";
                readonly type: "single_choice";
                readonly text: "¿En qué plataforma vendes principalmente?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Shopify";
                    readonly score: 80;
                }, {
                    readonly id: "o2";
                    readonly text: "WooCommerce";
                    readonly score: 70;
                }, {
                    readonly id: "o3";
                    readonly text: "Mercado Libre / Amazon";
                    readonly score: 50;
                }, {
                    readonly id: "o4";
                    readonly text: "Tienda propia personalizada";
                    readonly score: 90;
                }];
            }, {
                readonly id: "q4";
                readonly type: "single_choice";
                readonly text: "¿Actualmente inviertes en publicidad digital?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Sí, más de $1000 USD/mes";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "Sí, menos de $1000 USD/mes";
                    readonly score: 60;
                }, {
                    readonly id: "o3";
                    readonly text: "Solo orgánico";
                    readonly score: 30;
                }, {
                    readonly id: "o4";
                    readonly text: "No invertimos aún";
                    readonly score: 10;
                }];
            }, {
                readonly id: "q5";
                readonly type: "text";
                readonly text: "¿Cuál es la URL de tu tienda?";
            }];
        };
    }, {
        readonly id: "inmobiliaria";
        readonly industry: "Inmobiliaria / Real Estate";
        readonly icon: "🏠";
        readonly name: "Diagnóstico Inmobiliario";
        readonly description: "Califica compradores y vendedores según intención, capacidad financiera y urgencia.";
        readonly estimatedConversion: "41%";
        readonly questions: 5;
        readonly quizConfig: {
            readonly title: "Diagnóstico Inmobiliario";
            readonly description: "¿Estás listo para tu próxima propiedad?";
            readonly questions: readonly [{
                readonly id: "q1";
                readonly type: "single_choice";
                readonly text: "¿Qué buscas hacer en los próximos 6 meses?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Comprar mi primera vivienda";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "Comprar como inversión";
                    readonly score: 80;
                }, {
                    readonly id: "o3";
                    readonly text: "Vender mi propiedad actual";
                    readonly score: 90;
                }, {
                    readonly id: "o4";
                    readonly text: "Arrendar una propiedad";
                    readonly score: 50;
                }];
            }, {
                readonly id: "q2";
                readonly type: "single_choice";
                readonly text: "¿Cuál es tu rango de presupuesto?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Menos de $80.000 USD";
                    readonly score: 40;
                }, {
                    readonly id: "o2";
                    readonly text: "$80.000 – $200.000 USD";
                    readonly score: 70;
                }, {
                    readonly id: "o3";
                    readonly text: "$200.000 – $500.000 USD";
                    readonly score: 90;
                }, {
                    readonly id: "o4";
                    readonly text: "Más de $500.000 USD";
                    readonly score: 100;
                }];
            }, {
                readonly id: "q3";
                readonly type: "single_choice";
                readonly text: "¿Tienes financiamiento o crédito pre-aprobado?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Sí, crédito aprobado";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "En proceso de aprobación";
                    readonly score: 70;
                }, {
                    readonly id: "o3";
                    readonly text: "Pagaré al contado";
                    readonly score: 100;
                }, {
                    readonly id: "o4";
                    readonly text: "Aún no he gestionado financiamiento";
                    readonly score: 20;
                }];
            }, {
                readonly id: "q4";
                readonly type: "single_choice";
                readonly text: "¿Cuándo esperas concretar la operación?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Este mes";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "En 1–3 meses";
                    readonly score: 80;
                }, {
                    readonly id: "o3";
                    readonly text: "En 3–6 meses";
                    readonly score: 50;
                }, {
                    readonly id: "o4";
                    readonly text: "Más de 6 meses";
                    readonly score: 20;
                }];
            }, {
                readonly id: "q5";
                readonly type: "text";
                readonly text: "¿En qué ciudad o sector buscas?";
            }];
        };
    }, {
        readonly id: "coaching";
        readonly industry: "Coaching / Consultoría";
        readonly icon: "🎯";
        readonly name: "Diagnóstico de Negocio";
        readonly description: "Evalúa el estado del negocio del prospecto e identifica el área de mayor impacto.";
        readonly estimatedConversion: "38%";
        readonly questions: 5;
        readonly quizConfig: {
            readonly title: "Diagnóstico de Negocio";
            readonly description: "¿En qué área de tu negocio necesitas más apoyo?";
            readonly questions: readonly [{
                readonly id: "q1";
                readonly type: "single_choice";
                readonly text: "¿Cuánto factura tu empresa mensualmente?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Menos de $3.000 USD";
                    readonly score: 30;
                }, {
                    readonly id: "o2";
                    readonly text: "$3.000 – $15.000 USD";
                    readonly score: 60;
                }, {
                    readonly id: "o3";
                    readonly text: "$15.000 – $50.000 USD";
                    readonly score: 80;
                }, {
                    readonly id: "o4";
                    readonly text: "Más de $50.000 USD";
                    readonly score: 100;
                }];
            }, {
                readonly id: "q2";
                readonly type: "single_choice";
                readonly text: "¿Cuál es tu mayor freno de crecimiento?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "No tengo suficientes clientes";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "Cobro poco por mis servicios";
                    readonly score: 80;
                }, {
                    readonly id: "o3";
                    readonly text: "No tengo tiempo para crecer";
                    readonly score: 70;
                }, {
                    readonly id: "o4";
                    readonly text: "Mi equipo no da abasto";
                    readonly score: 60;
                }];
            }, {
                readonly id: "q3";
                readonly type: "single_choice";
                readonly text: "¿Has invertido en mentoría o consultoría antes?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Sí, con excelentes resultados";
                    readonly score: 90;
                }, {
                    readonly id: "o2";
                    readonly text: "Sí, pero sin buenos resultados";
                    readonly score: 50;
                }, {
                    readonly id: "o3";
                    readonly text: "No, pero estoy interesado";
                    readonly score: 70;
                }, {
                    readonly id: "o4";
                    readonly text: "No creo en ello";
                    readonly score: 10;
                }];
            }, {
                readonly id: "q4";
                readonly type: "single_choice";
                readonly text: "¿Cuánto estarías dispuesto a invertir mensualmente?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Menos de $500 USD";
                    readonly score: 20;
                }, {
                    readonly id: "o2";
                    readonly text: "$500 – $2.000 USD";
                    readonly score: 60;
                }, {
                    readonly id: "o3";
                    readonly text: "$2.000 – $5.000 USD";
                    readonly score: 90;
                }, {
                    readonly id: "o4";
                    readonly text: "Más de $5.000 USD";
                    readonly score: 100;
                }];
            }, {
                readonly id: "q5";
                readonly type: "text";
                readonly text: "¿Cuál es tu nombre y tu negocio?";
            }];
        };
    }, {
        readonly id: "salud";
        readonly industry: "Salud / Bienestar";
        readonly icon: "🏥";
        readonly name: "Diagnóstico de Salud";
        readonly description: "Califica pacientes potenciales según síntomas, urgencia y disposición a consultar.";
        readonly estimatedConversion: "45%";
        readonly questions: 5;
        readonly quizConfig: {
            readonly title: "Diagnóstico de Salud";
            readonly description: "¿Cuándo fue tu última revisión de salud?";
            readonly questions: readonly [{
                readonly id: "q1";
                readonly type: "single_choice";
                readonly text: "¿Con qué frecuencia visitas a un especialista de salud?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Nunca o casi nunca";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "Solo cuando hay urgencia";
                    readonly score: 80;
                }, {
                    readonly id: "o3";
                    readonly text: "1 vez al año como control";
                    readonly score: 50;
                }, {
                    readonly id: "o4";
                    readonly text: "Regularmente, cada trimestre";
                    readonly score: 20;
                }];
            }, {
                readonly id: "q2";
                readonly type: "single_choice";
                readonly text: "¿Cuál es tu mayor preocupación de salud hoy?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Dolor crónico o muscular";
                    readonly score: 90;
                }, {
                    readonly id: "o2";
                    readonly text: "Estrés o salud mental";
                    readonly score: 100;
                }, {
                    readonly id: "o3";
                    readonly text: "Control de peso";
                    readonly score: 80;
                }, {
                    readonly id: "o4";
                    readonly text: "Revisión preventiva general";
                    readonly score: 60;
                }];
            }, {
                readonly id: "q3";
                readonly type: "single_choice";
                readonly text: "¿Tienes seguro de salud o cobertura médica?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Sí, seguro privado completo";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "Sí, cobertura básica";
                    readonly score: 60;
                }, {
                    readonly id: "o3";
                    readonly text: "Solo Fonasa / seguro público";
                    readonly score: 40;
                }, {
                    readonly id: "o4";
                    readonly text: "No tengo seguro actualmente";
                    readonly score: 20;
                }];
            }, {
                readonly id: "q4";
                readonly type: "single_choice";
                readonly text: "¿Qué tan urgente es para ti atenderte?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Muy urgente, necesito cita esta semana";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "Este mes si se puede";
                    readonly score: 70;
                }, {
                    readonly id: "o3";
                    readonly text: "En algún momento próximo";
                    readonly score: 40;
                }, {
                    readonly id: "o4";
                    readonly text: "Sin apuro, solo quiero información";
                    readonly score: 10;
                }];
            }, {
                readonly id: "q5";
                readonly type: "text";
                readonly text: "¿Cuál es tu nombre y tu correo de contacto?";
            }];
        };
    }, {
        readonly id: "agencia";
        readonly industry: "Agencia de Marketing";
        readonly icon: "📣";
        readonly name: "Diagnóstico de Marketing Digital";
        readonly description: "Detecta brechas en la estrategia digital del cliente y justifica una propuesta de servicios.";
        readonly estimatedConversion: "35%";
        readonly questions: 5;
        readonly quizConfig: {
            readonly title: "Diagnóstico de Marketing Digital";
            readonly description: "¿Tu empresa está aprovechando el marketing digital?";
            readonly questions: readonly [{
                readonly id: "q1";
                readonly type: "single_choice";
                readonly text: "¿Cuánto invierten mensualmente en publicidad digital?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "No invertimos";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "Menos de $500 USD";
                    readonly score: 80;
                }, {
                    readonly id: "o3";
                    readonly text: "$500 – $3.000 USD";
                    readonly score: 60;
                }, {
                    readonly id: "o4";
                    readonly text: "Más de $3.000 USD";
                    readonly score: 40;
                }];
            }, {
                readonly id: "q2";
                readonly type: "single_choice";
                readonly text: "¿Miden el ROI de sus campañas?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "No, no sabemos cómo medirlo";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "Solo vemos métricas básicas (likes, clics)";
                    readonly score: 70;
                }, {
                    readonly id: "o3";
                    readonly text: "Sí, usamos Analytics y atribución";
                    readonly score: 30;
                }, {
                    readonly id: "o4";
                    readonly text: "Tenemos un sistema propio de BI";
                    readonly score: 10;
                }];
            }, {
                readonly id: "q3";
                readonly type: "single_choice";
                readonly text: "¿Tienen presencia activa en redes sociales?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "No tenemos o está abandonada";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "Publicamos 1–2 veces por semana";
                    readonly score: 60;
                }, {
                    readonly id: "o3";
                    readonly text: "Publicamos diariamente";
                    readonly score: 30;
                }, {
                    readonly id: "o4";
                    readonly text: "Tenemos equipo interno dedicado";
                    readonly score: 10;
                }];
            }, {
                readonly id: "q4";
                readonly type: "single_choice";
                readonly text: "¿Qué resultado buscas en los próximos 90 días?";
                readonly options: readonly [{
                    readonly id: "o1";
                    readonly text: "Generar más leads calificados";
                    readonly score: 100;
                }, {
                    readonly id: "o2";
                    readonly text: "Aumentar ventas directas";
                    readonly score: 90;
                }, {
                    readonly id: "o3";
                    readonly text: "Mejorar reconocimiento de marca";
                    readonly score: 60;
                }, {
                    readonly id: "o4";
                    readonly text: "Fidelizar clientes actuales";
                    readonly score: 50;
                }];
            }, {
                readonly id: "q5";
                readonly type: "text";
                readonly text: "¿Nombre de tu empresa y rubro principal?";
            }];
        };
    }];
    createFromTemplate(tenantId: string, userId: string, templateId: string, overrides: {
        name?: string;
        slug?: string;
    }): Promise<{
        name: string;
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        status: string;
        createdBy: string | null;
        quizConfig: import("@prisma/client/runtime/library").JsonValue;
        landingConfig: import("@prisma/client/runtime/library").JsonValue;
        resultsConfig: import("@prisma/client/runtime/library").JsonValue;
        scoringRules: import("@prisma/client/runtime/library").JsonValue | null;
        publishedAt: Date | null;
        totalViews: number;
        totalStarts: number;
        totalCompletions: number;
        abTestEnabled: boolean;
    }>;
    private toSlug;
    getVariants(tenantId: string, funnelId: string): Promise<{
        name: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string;
        quizConfig: import("@prisma/client/runtime/library").JsonValue | null;
        landingConfig: import("@prisma/client/runtime/library").JsonValue | null;
        resultsConfig: import("@prisma/client/runtime/library").JsonValue | null;
        totalViews: number;
        totalStarts: number;
        totalCompletions: number;
        trafficSplit: number;
        isControl: boolean;
    }[]>;
    createVariant(tenantId: string, funnelId: string, dto: CreateVariantDto): Promise<{
        name: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string;
        quizConfig: import("@prisma/client/runtime/library").JsonValue | null;
        landingConfig: import("@prisma/client/runtime/library").JsonValue | null;
        resultsConfig: import("@prisma/client/runtime/library").JsonValue | null;
        totalViews: number;
        totalStarts: number;
        totalCompletions: number;
        trafficSplit: number;
        isControl: boolean;
    }>;
    updateVariant(tenantId: string, funnelId: string, variantId: string, dto: UpdateVariantDto): Promise<{
        name: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string;
        quizConfig: import("@prisma/client/runtime/library").JsonValue | null;
        landingConfig: import("@prisma/client/runtime/library").JsonValue | null;
        resultsConfig: import("@prisma/client/runtime/library").JsonValue | null;
        totalViews: number;
        totalStarts: number;
        totalCompletions: number;
        trafficSplit: number;
        isControl: boolean;
    }>;
    deleteVariant(tenantId: string, funnelId: string, variantId: string): Promise<{
        name: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string;
        quizConfig: import("@prisma/client/runtime/library").JsonValue | null;
        landingConfig: import("@prisma/client/runtime/library").JsonValue | null;
        resultsConfig: import("@prisma/client/runtime/library").JsonValue | null;
        totalViews: number;
        totalStarts: number;
        totalCompletions: number;
        trafficSplit: number;
        isControl: boolean;
    }>;
}
