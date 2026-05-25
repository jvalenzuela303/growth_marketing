"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const deals_service_1 = require("../deals/deals.service");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    constructor(prisma, deals) {
        this.prisma = prisma;
        this.deals = deals;
        this.logger = new common_1.Logger(AnalyticsService_1.name);
    }
    async getFunnelAbandonmentStats(tenantId, funnelId) {
        const funnel = await this.prisma.withTenant(tenantId, () => this.prisma.funnel.findFirst({
            where: { id: funnelId, tenantId },
            select: { id: true, name: true, quizConfig: true },
        }));
        if (!funnel)
            throw new common_1.NotFoundException('Funnel no encontrado.');
        const quizConfig = funnel.quizConfig;
        const questions = quizConfig?.questions ?? [];
        return this.prisma.withTenant(tenantId, async () => {
            const [totalStarts, totalCompletions] = await Promise.all([
                this.prisma.leadEvent.count({
                    where: { tenantId, funnelId, eventType: 'quiz_start' },
                }),
                this.prisma.leadEvent.count({
                    where: { tenantId, funnelId, eventType: 'quiz_complete' },
                }),
            ]);
            const answered = await this.prisma.$queryRaw `
        SELECT
          event_data->>'questionIndex' AS question_index,
          COUNT(*) AS cnt
        FROM lead_events
        WHERE tenant_id  = ${tenantId}::uuid
          AND funnel_id  = ${funnelId}::uuid
          AND event_type = 'question_answered'
          AND event_data->>'questionIndex' IS NOT NULL
        GROUP BY event_data->>'questionIndex'
        ORDER BY (event_data->>'questionIndex')::int ASC
      `;
            const viewMap = new Map();
            for (const row of answered) {
                viewMap.set(Number(row.question_index), Number(row.cnt));
            }
            const steps = questions.map((q, idx) => {
                const views = viewMap.get(idx) ?? 0;
                const completions = idx < questions.length - 1
                    ? (viewMap.get(idx + 1) ?? 0)
                    : totalCompletions;
                const drops = Math.max(0, views - completions);
                const dropOffRate = views > 0 ? Math.round((drops / views) * 10000) / 100 : 0;
                return {
                    questionIndex: idx,
                    questionText: q.text ?? q.label ?? `Pregunta ${idx + 1}`,
                    views,
                    completions,
                    dropOffRate,
                };
            });
            return {
                funnelId,
                funnelName: funnel.name,
                totalStarts,
                totalCompletions,
                completionRate: totalStarts > 0
                    ? Math.round((totalCompletions / totalStarts) * 10000) / 100
                    : 0,
                steps,
            };
        });
    }
    async getFinancialKpis(tenantId, range) {
        const days = this.parseDays(range);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return this.prisma.withTenant(tenantId, async () => {
            const [spendAgg, totalLeads] = await Promise.all([
                this.prisma.adSpend.aggregate({
                    where: {
                        tenantId,
                        periodStart: { gte: since },
                    },
                    _sum: { spendAmount: true },
                }),
                this.prisma.lead.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                        createdAt: { gte: since },
                    },
                }),
            ]);
            const totalSpend = Number(spendAgg._sum.spendAmount ?? 0);
            const cpl = totalLeads > 0 ? Math.round((totalSpend / totalLeads) * 100) / 100 : null;
            const { totalRevenue, dealCount } = await this.deals.aggregateRevenue(tenantId, since);
            const roas = totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0;
            return {
                range,
                since: since.toISOString(),
                totalSpend,
                totalLeads,
                cpl,
                roas,
                totalRevenue,
                dealCount,
                currency: 'CLP',
            };
        });
    }
    async getAttributionByChannel(tenantId, range) {
        const days = this.parseDays(range);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return this.prisma.withTenant(tenantId, async () => {
            const leadsBySource = await this.prisma.$queryRaw `
        SELECT
          COALESCE(source, 'direct') AS source,
          COUNT(*) AS leads,
          ROUND(AVG(COALESCE(quiz_score,0) + COALESCE(behavior_score,0) +
                    COALESCE(engagement_score,0) + COALESCE(demographic_score,0))::numeric, 1) AS avg_score
        FROM leads
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND created_at >= ${since}
        GROUP BY source
        ORDER BY leads DESC
      `;
            const dealsBySource = await this.prisma.$queryRaw `
        SELECT
          COALESCE(l.source, 'direct') AS source,
          COUNT(d.id) AS deals,
          COALESCE(SUM(d.amount), 0) AS revenue
        FROM deals d
        JOIN leads l ON l.id = d.lead_id
        WHERE d.tenant_id = ${tenantId}::uuid
          AND d.stage = 'won'
          AND d.created_at >= ${since}
        GROUP BY l.source
      `;
            const spendByPlatform = await this.prisma.$queryRaw `
        SELECT
          LOWER(source) AS platform,
          COALESCE(SUM(spend_amount), 0) AS spend
        FROM ad_spend
        WHERE tenant_id = ${tenantId}::uuid
          AND period_start >= ${since}
        GROUP BY source
      `;
            const spendMap = new Map();
            for (const s of spendByPlatform) {
                const key = s.platform === 'meta' ? 'facebook' : s.platform;
                spendMap.set(key, (spendMap.get(key) ?? 0) + Number(s.spend));
            }
            const dealsMap = new Map();
            for (const d of dealsBySource) {
                dealsMap.set(d.source, { deals: Number(d.deals), revenue: Number(d.revenue) });
            }
            const channels = leadsBySource.map((row) => {
                const source = row.source;
                const leads = Number(row.leads);
                const spend = spendMap.get(source) ?? 0;
                const deal = dealsMap.get(source) ?? { deals: 0, revenue: 0 };
                const cpl = leads > 0 && spend > 0 ? Math.round((spend / leads) * 100) / 100 : null;
                const convRate = leads > 0 ? Math.round((deal.deals / leads) * 10000) / 100 : 0;
                const roas = spend > 0 ? Math.round((deal.revenue / spend) * 100) / 100 : null;
                return {
                    source,
                    leads,
                    avgScore: Number(row.avg_score),
                    adSpend: spend,
                    deals: deal.deals,
                    revenue: deal.revenue,
                    cpl,
                    conversionRate: convRate,
                    roas,
                };
            });
            const totals = channels.reduce((acc, c) => ({
                leads: acc.leads + c.leads,
                adSpend: acc.adSpend + c.adSpend,
                deals: acc.deals + c.deals,
                revenue: acc.revenue + c.revenue,
            }), { leads: 0, adSpend: 0, deals: 0, revenue: 0 });
            return { range, since: since.toISOString(), channels, totals };
        });
    }
    async streamConversionAdvisor(res, tenantId, range, question) {
        const days = this.parseDays(range);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const [kpis, attribution, campaigns] = await Promise.allSettled([
            this.getFinancialKpis(tenantId, range),
            this.getAttributionByChannel(tenantId, range),
            this.prisma.withTenant(tenantId, () => this.prisma.$queryRaw `
          SELECT
            ac.name,
            LOWER(ac.platform) AS platform,
            ac.status,
            COALESCE(ac.impressions, 0)   AS impressions,
            COALESCE(ac.clicks, 0)        AS clicks,
            COALESCE(SUM(ads.spend_amount), 0) AS spend,
            COUNT(DISTINCT l.id)          AS leads
          FROM ad_campaigns ac
          LEFT JOIN ad_spend ads
            ON ads.campaign_id = ac.external_id
           AND ads.tenant_id   = ${tenantId}::uuid
           AND ads.period_start >= ${since}
          LEFT JOIN leads l
            ON l.utm_campaign = ac.name
           AND l.tenant_id    = ${tenantId}::uuid
           AND l.created_at   >= ${since}
          WHERE ac.tenant_id = ${tenantId}::uuid
          GROUP BY ac.id, ac.name, ac.platform, ac.status, ac.impressions, ac.clicks
          ORDER BY spend DESC
          LIMIT 20
        `),
        ]);
        const k = kpis.status === 'fulfilled' ? kpis.value : null;
        const a = attribution.status === 'fulfilled' ? attribution.value : null;
        const c = campaigns.status === 'fulfilled' ? campaigns.value : [];
        const fmtClp = (n) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M CLP`
            : n >= 1_000 ? `$${Math.round(n / 1000)}K CLP`
                : `$${Math.round(n)} CLP`;
        const kpiBlock = k
            ? `## KPIs actuales (${range})
- Inversión total: ${fmtClp(k.totalSpend)}
- Leads captados: ${k.totalLeads}
- CPL (Costo por Lead): ${k.cpl ? fmtClp(k.cpl) : 'Sin datos'}
- ROAS global: ${k.roas}x
- Revenue atribuido: ${fmtClp(k.totalRevenue)}
- Deals cerrados: ${k.dealCount}`
            : '## KPIs: sin datos disponibles';
        const channelBlock = a?.channels?.length
            ? `## Atribución por canal\n` + a.channels.map((ch) => `- ${ch.source}: ${ch.leads} leads | CPL ${ch.cpl ? fmtClp(ch.cpl) : 'N/A'} | ROAS ${ch.roas ?? 'N/A'}x | Conv. ${ch.conversionRate}%`).join('\n')
            : '## Canales: sin datos de atribución';
        const campaignBlock = c.length
            ? `## Campañas (top ${c.length})\n` + c.map((camp) => {
                const imp = Number(camp.impressions);
                const clks = Number(camp.clicks);
                const ctr = imp > 0 ? ((clks / imp) * 100).toFixed(2) : 'N/A';
                const leads = Number(camp.leads);
                return `- [${camp.status}] ${camp.name} (${camp.platform}): gasto ${fmtClp(Number(camp.spend))} | CTR ${ctr}% | ${leads} leads`;
            }).join('\n')
            : '## Campañas: sin datos';
        const analysis = this.buildRuleBasedAnalysis({ k, a, c, range, fmtClp, question });
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        });
        try {
            const tokens = analysis.match(/.{1,4}/g) ?? [];
            for (const token of tokens) {
                res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
                await new Promise((r) => setTimeout(r, 12));
            }
            res.write('data: [DONE]\n\n');
        }
        catch (err) {
            this.logger.error('Conversion advisor stream error', err);
            res.write(`data: ${JSON.stringify({ error: 'Error al generar el análisis.' })}\n\n`);
        }
        finally {
            res.end();
        }
    }
    buildRuleBasedAnalysis(opts) {
        const { k, a, c, range, fmtClp, question } = opts;
        const lines = [];
        const channels = a?.channels ?? [];
        lines.push(`## Análisis de Conversiones — ${range}`);
        lines.push('');
        lines.push('## Diagnóstico global');
        if (!k || (k.totalSpend === 0 && k.totalLeads === 0)) {
            lines.push('- Sin datos de inversión ni leads en este período.');
            lines.push('- Registra gasto en campañas y conecta tus fuentes de tráfico para ver recomendaciones.');
            lines.push('');
            lines.push('## Próximos pasos');
            lines.push('- Conecta una cuenta de Meta Ads o Google Ads en la sección Publicidad.');
            lines.push('- Registra al menos un período de gasto para activar el análisis ROAS.');
            lines.push('- Crea un funnel y capta tus primeros leads para medir CPL real.');
            return lines.join('\n');
        }
        const roas = k.roas ?? 0;
        const cpl = k.cpl ?? 0;
        const leads = k.totalLeads;
        const deals = k.dealCount;
        const convRate = leads > 0 ? Math.round((deals / leads) * 10000) / 100 : 0;
        if (roas >= 3) {
            lines.push(`- **ROAS global ${roas}x** — rendimiento saludable. Hay margen para escalar inversión.`);
        }
        else if (roas >= 1) {
            lines.push(`- **ROAS global ${roas}x** — por encima del punto de equilibrio, pero con oportunidad de mejora.`);
        }
        else if (k.totalSpend > 0) {
            lines.push(`- 🚨 **ROAS global ${roas}x — por debajo del punto de equilibrio.** Cada peso invertido retorna menos de lo que cuesta. Acción urgente requerida.`);
        }
        if (cpl > 0) {
            lines.push(`- CPL actual: **${fmtClp(cpl)}** — ${cpl > 50000 ? 'alto, revisar segmentación de audiencia' : 'dentro de rangos normales'}.`);
        }
        lines.push(`- Tasa de conversión lead → deal: **${convRate}%** — ${convRate < 1 ? 'baja, el cuello de botella está en el proceso de cierre o calidad de leads' : convRate < 5 ? 'mejorable con mejor nurturing' : 'buena, foco en escalar volumen'}.`);
        lines.push('');
        if (channels.length > 0) {
            lines.push('## Análisis por canal');
            const withRoas = channels.filter((ch) => ch.roas !== null && (ch.roas ?? 0) > 0);
            const bestRoas = withRoas.sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))[0];
            const worstRoas = withRoas.sort((a, b) => (a.roas ?? 0) - (b.roas ?? 0))[0];
            if (bestRoas) {
                lines.push(`- ✅ **Mejor canal: ${bestRoas.source}** — ROAS ${bestRoas.roas}x, ${bestRoas.leads} leads, conv. ${bestRoas.conversionRate}%. Considera aumentar presupuesto aquí.`);
            }
            if (worstRoas && worstRoas.source !== bestRoas?.source && (worstRoas.roas ?? 0) < 1) {
                lines.push(`- 🚨 **Canal crítico: ${worstRoas.source}** — ROAS ${worstRoas.roas}x. Pausa o reduce inversión hasta revisar creativos y audiencia.`);
            }
            const organicChannels = channels.filter((ch) => ch.adSpend === 0 && ch.leads > 0);
            if (organicChannels.length > 0) {
                const names = organicChannels.map((ch) => ch.source).join(', ');
                lines.push(`- 💡 **Tráfico orgánico activo: ${names}** — genera leads sin costo. Analiza qué lo impulsa y replica esa estrategia de contenido.`);
            }
            lines.push('');
        }
        const activeCampaigns = c.filter((camp) => camp.status === 'ACTIVE');
        if (activeCampaigns.length > 0) {
            lines.push('## Campañas activas');
            const lowCtr = activeCampaigns.filter((camp) => {
                const imp = Number(camp.impressions);
                const clk = Number(camp.clicks);
                return imp > 500 && imp > 0 && (clk / imp) * 100 < 1;
            });
            if (lowCtr.length > 0) {
                lines.push(`- ⚠️ **CTR < 1% en ${lowCtr.length} campaña(s):** ${lowCtr.map((c) => c.name).join(', ')}. Señal de problema creativo o de audiencia — prueba nuevos copys o segmentaciones.`);
            }
            const noLeadCampaigns = activeCampaigns.filter((camp) => Number(camp.leads) === 0 && Number(camp.spend) > 0);
            if (noLeadCampaigns.length > 0) {
                lines.push(`- ⚠️ **${noLeadCampaigns.length} campaña(s) con gasto pero 0 leads captados.** Revisa el landing page, el formulario y la coherencia del mensaje con la audiencia.`);
            }
            lines.push('');
        }
        lines.push('## Recomendaciones priorizadas');
        const recs = [];
        if (roas < 1 && k.totalSpend > 0) {
            recs.push('**[URGENTE]** Pausa campañas con ROAS < 1x y redirige ese presupuesto a los canales de mayor rendimiento.');
        }
        if (convRate < 2 && leads > 0) {
            recs.push('**Mejora el proceso de cierre:** activa secuencias de seguimiento automático (WhatsApp + email) para leads con score > 60 que no han respondido en 48h.');
        }
        if (cpl > 0 && cpl > 30000) {
            recs.push('**Reduce el CPL:** prueba audiencias lookalike basadas en tus leads "fuego" (score > 80) — suelen tener CPL 30-50% menor que audiencias de intereses.');
        }
        if (activeCampaigns.length > 0) {
            recs.push('**Test A/B de creativos:** crea 2-3 variantes de anuncio por campaña activa. Con presupuesto mínimo de prueba detectarás el creativo ganador en 7 días.');
        }
        if (channels.some((ch) => ch.conversionRate > 0 && ch.adSpend === 0)) {
            recs.push('**Escala lo que ya funciona orgánicamente:** identifica el contenido que genera leads gratis y amplifícalo con presupuesto pagado.');
        }
        recs.push('**Optimiza la página de captura:** un cambio de headline o CTA puede aumentar la tasa de conversión del funnel un 15-40% sin tocar los anuncios.');
        recs.push('**Activa lead scoring automático:** prioriza los leads con score > 70 para contacto inmediato — la tasa de cierre cae un 80% después de 5 minutos sin respuesta.');
        if (question) {
            lines.push('');
            lines.push(`## Respuesta a tu pregunta`);
            lines.push(`Basado en los datos del período ${range}: ${question}`);
            lines.push('');
            lines.push('Para responder con precisión necesitaría más contexto específico, pero con los datos actuales la acción de mayor impacto es mejorar la tasa de conversión lead → deal, que actualmente está en ' + convRate + '%.');
        }
        recs.forEach((r) => lines.push(`- ${r}`));
        return lines.join('\n');
    }
    parseDays(range) {
        const match = range?.match(/^(\d+)d$/);
        if (match)
            return Math.min(365, Math.max(1, Number(match[1])));
        return 30;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        deals_service_1.DealsService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map